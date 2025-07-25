export const runtime = 'edge';

import { auth } from "@clerk/nextjs/server";
import { fetchAction, fetchMutation } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import { CoreMessage, streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getAuthToken } from "@/app/auth";

export async function POST(req: Request) {
  try {
    await auth.protect();

    const token = await getAuthToken();
    if (!token) throw new Error("Failed to authenticate with jwt");

    const body = await req.json();

    const { chat_id, useageId, credits, model, encryptedApiKey, history } =
      body;

    if (!encryptedApiKey) throw new Error("No encrypted api key provided!");

    const latestMessage = history[history.length - 1];
    await fetchMutation(
      api.messages.saveUserMessage,
      {
        chat_id,
        userMessage: latestMessage,
        model,
      },
      { token }
    );

    const messageId = await fetchMutation(
      api.messages.initiateMessage,
      {
        chat_id,
        model,
      },
      { token }
    );

    await fetchMutation(
      api.users.updateUseage,
      {
        useageId,
        credits: credits - 1,
      },
      { token }
    );

    const decryptedApiKey = await fetchAction(
      api.keysActions.simpleDecryptKey,
      {
        encryptedApiKey,
      },
      { token }
    );

    let formattedHistory = history as CoreMessage[];

    const fileSupportedLLMs = ["gemini-2.0-flash"];

    if (fileSupportedLLMs.includes(model)) {
      const noFilesFormat: {
        role: "system" | "user" | "assistant" | "tool";
        content: string;
      }[] = [];
      formattedHistory.map((message) => {
        if (typeof message.content === "string") {
          noFilesFormat.push({
            role: message.role,
            content: message.content,
          });
        } else {
          noFilesFormat.push({
            role: message.role,
            content:
              message.content[0].type === "text" ? message.content[0].text : "",
          });
        }
      });

      formattedHistory = noFilesFormat as CoreMessage[];
    }

    const groq = createGroq({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: decryptedApiKey.apiKey,
    });

    const google = createGoogleGenerativeAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta",
      apiKey: decryptedApiKey.apiKey,
    });
    
    const modelInvocation = fileSupportedLLMs.includes(model) ? google(model, {
          useSearchGrounding: true,
        }) : groq(model);
        
    const { textStream } = streamText({
      model: modelInvocation,
      system: "You are a professional assistant",
      messages: formattedHistory,
      abortSignal: req.signal
    });
  
    let content = "";
    let chunkCount = 0;
    let lastUpdate = Date.now();
    const UPDATE_INTERVAL = 500; // Update every 500ms
    const CHUNK_BATCH_SIZE = 10; // Or every 10 chunks
    let userAborted = false;

    try {
      for await (const textPart of textStream) {
        if (req.signal?.aborted) {
          console.log("User aborted request, stopping stream processing");
          userAborted = true;
          break;
        }
  
        content += textPart;
        chunkCount++;
  
        const now = Date.now();
        const shouldUpdate =
          chunkCount >= CHUNK_BATCH_SIZE || now - lastUpdate >= UPDATE_INTERVAL;
  
        if (shouldUpdate) {
          if (req.signal?.aborted) {
            console.log("User aborted during update");
            userAborted = true;
            break;
          }
          await fetchMutation(
            api.messages.updateMessageRoute,
            {
              messageId,
              content,
            },
            { token }
          );
          chunkCount = 0;
          lastUpdate = now;
        }
      }
    } catch (streamError) {
      if (streamError instanceof Error) {
        if(streamError.name === "AbortError" ||
          streamError.name.includes('aborted') ||
          streamError.name.includes('ResponseAborted')
        ) {
          if (req.signal?.aborted) {
            console.log("User-initiated stream abort:", streamError.message);
            userAborted = true;
          } else {
            // System interruption - this is an error condition
            console.error("System interruption:", streamError.message);
            throw streamError;
          }
        } else {
          console.error("Stream error: ", streamError);
          throw streamError;
        }
      } else {
        throw streamError;
      }
    }
    
    if (userAborted || !req.signal?.aborted) {
      await fetchMutation(
        api.messages.updateMessageRoute,
        {
          messageId,
          content,
        },
        { token }
      );
  
      await fetchMutation(
        api.messages.completeMessageRoute,
        {
          messageId,
        },
        { token }
      );
    }
    console.log("end")
    console.log(userAborted ? "Stream stopped by user" : "Successfully generated new message");
    return NextResponse.json({ 
      content: userAborted ? "Stream stopped by user" : "Successfully generated new message"
    }, { status: 200 });
  } catch (error) {
    console.log("Error: ", error);
    
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
