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
    // console.log("Body: ", body);
    // console.log("Type for body: ", typeof body);
    // console.log("prompt", body.prompt);
    const stringifiedBody = body.prompt;
    const parsedBody = JSON.parse(stringifiedBody);
    
    // console.log("parsedBody type: ", typeof parsedBody);
    // console.log("encryptedApiKey", parsedBody.encryptedApiKey);


    const { 
      chat_id,
      useageId, 
      credits, 
      model, 
      encryptedApiKey, 
      history 
    } = parsedBody;

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
    
    const result = streamText({
      model: modelInvocation,
      system: "You are a professional assistant",
      messages: formattedHistory,
      abortSignal: req.signal,
    });
    
    (async () => {
      let content = "";
      // let chunkCount = 0;
      // let lastUpdate = Date.now();
      // const UPDATE_INTERVAL = 800; // Update every 800ms
      // const CHUNK_BATCH_SIZE = 40; // Or every 40 chunks

      for await (const chunk of result.fullStream) {
        // Process each chunk here - save to DB, log, etc.
        console.log('Chunk type:', chunk.type);
        
        if (chunk.type === 'text-delta') {
          // Handle text chunks
          // console.log('Text delta:', chunk.textDelta);
          content += chunk.textDelta;
          // chunkCount++;

          // const now = Date.now();
          // const shouldUpdate = chunkCount >= CHUNK_BATCH_SIZE || now - lastUpdate >= UPDATE_INTERVAL;

          // if (shouldUpdate) {
          //   await fetchMutation(
          //     api.messages.updateMessageRoute,
          //     {
          //       messageId,
          //       content,
          //     },
          //     { token }
          //   );
          //   chunkCount = 0;
          //   lastUpdate = now;
          // }

          // await fetchMutation(
          //   api.messages.updateMessageRoute,
          //   {
          //     messageId,
          //     content,
          //   },
          //   { token }
          // );

          console.log("content: ", content);
        } else if (chunk.type === 'finish') {
          // Handle completion
          await fetchMutation(
            api.messages.updateMessageRoute,
            {
              messageId,
              content,
            },
            { token }
          );
          console.log('Stream finished:', chunk.finishReason, chunk.usage);
          await fetchMutation(api.messages.completeMessage, {
            messageId: messageId
          },
          { token }
        );
        }
      }
    })().catch(console.error);

    return result.toDataStreamResponse();
  } catch (error) {
    console.log("Error: ", error);
    
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
