// export const runtime = 'edge';

import { auth } from "@clerk/nextjs/server";
import { fetchAction, fetchMutation } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import { consumeStream, ModelMessage, streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getAuthToken } from "@/app/auth";

export async function POST(req: Request) {
  try {
    await auth.protect();

    const token = await getAuthToken();
    if (!token) throw new Error("Failed to authenticate with jwt");

    const body = await req.json();
    const stringifiedBody = body.prompt;
    const parsedBody = JSON.parse(stringifiedBody);

    const { model, encryptedApiKey, history, messageId } = parsedBody;

    if (!encryptedApiKey) throw new Error("No encrypted api key provided!");

    const decryptedApiKey = await fetchAction(
      api.keysActions.simpleDecryptKey,
      {
        encryptedApiKey,
      },
      { token },
    );

    if (decryptedApiKey.success !== true) {
      throw new Error(`${decryptedApiKey.error}`);
    }

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

    const modelInvocation = fileSupportedLLMs.includes(model)
      ? google(model)
      : groq(model);

    let finalText = "";

    const result = streamText({
      model: modelInvocation,
      system: "You are a professional assistant",
      messages: formattedHistory,
      onChunk: ({ chunk }) => {
        if (chunk.type === "text-delta") {
          finalText += chunk.text;
        }
      },
      abortSignal: req.signal, // for now, the abortSignal implementation will not be focused on
    });

    return result.toUIMessageStreamResponse({
      onFinish: async () => {
        // console.log("message: ", messages);
        // console.log(
        //   JSON.stringify(messages, null, 2)
        // );

        // const assistantMessage = messages.find(m => m.role === 'assistant');

        // const finalText = assistantMessage?.parts
        //   .filter(p => p.type === 'text')
        //   .map(p => p.text)
        //   .join('') || '';

        await fetchMutation(
          api.messages.updateMessage,
          {
            messageId,
            content: finalText,
          },
          { token },
        );

        await fetchMutation(
          api.messages.completeMessage,
          {
            messageId,
          },
          { token },
        );

        console.log(finalText);
      },
      consumeSseStream: consumeStream,
    });
  } catch (error) {
    console.log("Error: ", error);

    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
