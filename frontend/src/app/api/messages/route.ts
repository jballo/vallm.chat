// export const runtime = 'edge';

import { auth } from "@clerk/nextjs/server";
import { fetchAction, fetchMutation } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import { ModelMessage, streamText } from "ai";
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

    const decryptedApiKey = await fetchAction(
      api.keysActions.simpleDecryptKey,
      {
        encryptedApiKey,
      },
      { token }
    );


    if (decryptedApiKey.success !== true) {
      throw new Error(`${decryptedApiKey.error}`)
    }


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


    let formattedHistory = history as ModelMessage[];

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

      formattedHistory = noFilesFormat as ModelMessage[];
    }

    const groq = createGroq({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: decryptedApiKey.apiKey,
    });

    const google = createGoogleGenerativeAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta",
      apiKey: decryptedApiKey.apiKey,
    });
    
    const modelInvocation = fileSupportedLLMs.includes(model) ? google(model) : groq(model);

    const result = streamText({
      model: modelInvocation,
      system: "You are a professional assistant",
      messages: formattedHistory,
      abortSignal: req.signal,       // for now, the abortSignal implementation will not be focused on
    });
    
    let streamErrored = false;
    let errorMessage = "";
    let content = "";

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta") {
        content += chunk.text;
        console.log("content: ", content);
      } else if (chunk.type === "finish") {
        await fetchMutation(
          api.messages.updateMessageRoute,
          {
            messageId,
            content,
          },
          { token }
        );
        console.log('Stream finished: ', chunk.finishReason, chunk.totalUsage);
      } else if (chunk.type === "error") {
        streamErrored = true;
        errorMessage = (typeof chunk.error === "string" ? chunk.error : "Chunk error");
        break;
      }
    }
    if (streamErrored) {
      await fetchMutation(api.messages.errorMessage, {
        messageId,
        errorMessage,
      }, { token });

      await fetchMutation(api.messages.completeMessage, {
        messageId,
      }, { token });

      return NextResponse.json(
        { error: "AI stream failure", details: errorMessage },
        { status: 500 }
      );
    }

    await fetchMutation(api.messages.completeMessage, {
        messageId
      },
      { token }
    );

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.log("Error: ", error);
    
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
