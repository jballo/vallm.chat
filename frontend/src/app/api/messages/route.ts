// export const runtime = 'edge';

import { auth } from "@clerk/nextjs/server";
import { fetchAction, fetchMutation } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import { consumeStream, ModelMessage, streamText } from "ai";
import { getAuthToken } from "@/app/auth";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

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

    const openrouter = createOpenRouter({
      apiKey: decryptedApiKey.apiKey,
    });

    let finalText = "";

    const result = streamText({
      model: openrouter.chat(model),
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
