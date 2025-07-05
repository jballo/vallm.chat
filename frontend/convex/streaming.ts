import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { coreMessage } from "./schema/types";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { CoreMessage, streamText } from "ai";
import { internal } from "./_generated/api";
import { createGroq } from "@ai-sdk/groq";

export const streamWithFiles = internalAction({
  args: {
    messageId: v.id("messages"),
    messages: v.array(coreMessage),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const { messageId, messages, model } = args;

    const google = createGoogleGenerativeAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta",
      apiKey: process.env.GEMINI_KEY,
    });

    const provider = google;

    const { textStream } = streamText({
      model: provider(model, {
        useSearchGrounding: true,
      }),
      system: "You are a professional assistant",
      messages: messages as CoreMessage[],
    });

    // const { textStream } = streamText({
    //   model: groq(model),
    //   system: "You are a professional assistant ready to help",
    //   messages: messages as CoreMessage[],
    // });

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
        await ctx.runMutation(internal.messages.updateMessage, {
          messageId,
          content,
        });
        chunkCount = 0;
        lastUpdate = now;
      }
    }

    // Final update and mark complete
    await ctx.runMutation(internal.messages.updateMessage, {
      messageId,
      content,
    });

    await ctx.runMutation(internal.messages.completeMessage, {
      messageId,
    });
  },
});

export const streamFullText = internalAction({
  args: {
    messageId: v.id("messages"),
    messages: v.array(coreMessage),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const { messageId, messages, model } = args;

    const formattedMessages: {
      role: "system" | "user" | "assistant" | "tool";
      content: string;
    }[] = [];

    messages.map((message) => {
      if (typeof message.content === "string") {
        formattedMessages.push({
          role: message.role,
          content: message.content,
        });
      } else {
        formattedMessages.push({
          role: message.role,
          content:
            message.content[0].type === "text" ? message.content[0].text : "",
        });
      }
    });

    const groq = createGroq({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_KEY,
    });

    const provider = groq;

    const { textStream } = streamText({
      model: provider(model),
      system: "You are a professional assistant",
      messages: formattedMessages as CoreMessage[],
    });

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
        await ctx.runMutation(internal.messages.updateMessage, {
          messageId,
          content,
        });
        chunkCount = 0;
        lastUpdate = now;
      }
    }

    // Final update and mark complete
    await ctx.runMutation(internal.messages.updateMessage, {
      messageId,
      content,
    });

    await ctx.runMutation(internal.messages.completeMessage, {
      messageId,
    });
  },
});
