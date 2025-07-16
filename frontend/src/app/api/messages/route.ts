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

    let textStream;

    if (fileSupportedLLMs.includes(model)) {
      ({ textStream } = streamText({
        model: google(model, {
          useSearchGrounding: true,
        }),
        system: "You are a professional assistant",
        messages: formattedHistory,
      }));
    } else {
      ({ textStream } = streamText({
        model: groq(model),
        system: "You are a professional assistant",
        messages: formattedHistory,
      }));
    }

    let content = "";
    let chunkCount = 0;
    let lastUpdate = Date.now();
    const UPDATE_INTERVAL = 500; // Update every 500ms
    const CHUNK_BATCH_SIZE = 10; // Or every 10 chunks

    for await (const textPart of textStream) {
      content += textPart;
      chunkCount++;

      const now = Date.now();
      const shouldUpdate =
        chunkCount >= CHUNK_BATCH_SIZE || now - lastUpdate >= UPDATE_INTERVAL;

      if (shouldUpdate) {
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
  } catch (error) {
    console.log("Error: ", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
