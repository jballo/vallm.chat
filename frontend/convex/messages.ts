import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { coreMessage } from "./schema/types";
import { api, internal } from "./_generated/api";

export const sendMessage = mutation({
  args: {
    conversationId: v.id("chats"),
    history: v.array(coreMessage),
    model: v.string(),
    useageId: v.id("useage"),
    credits: v.number(),
    encryptedApiKey: v.string(),
  },
  handler: async (ctx, args) => {
    // save user message
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }
    const user_id = identity.subject;
    const history = args.history;
    const msg = history[history.length - 1]; // most recent message by user
    const model = args.model;
    const conversation_id = args.conversationId;
    const useageId = args.useageId;
    const credits = args.credits;
    const encryptedApiKey = args.encryptedApiKey;

    if (encryptedApiKey === null) throw new Error("No appropriate api key");

    await ctx.db.patch(useageId, { messagesRemaining: credits - 1 });

    console.log("Message: ", msg);

    await ctx.db.insert("messages", {
      author_id: user_id,
      chat_id: conversation_id,
      message: msg,
      isComplete: true,
      error: false,
      model: model,
    });

    const message_id = await ctx.db.insert("messages", {
      author_id: user_id,
      chat_id: conversation_id,
      message: { role: "assistant", content: "" },
      isComplete: false,
      error: false,
      model: model,
    });
    const fileSupportedLLMs = ["gemini-2.0-flash"];

    // let encryptedApiKey = null;

    // if (model === "gemini-2.0-flash") {
    //   encryptedApiKey = await ctx.db
    //     .query("userApiKeys")
    //     .withIndex("by_user", (q) => q.eq("user_id", identity.subject))
    //     .filter((q) => q.eq(q.field("provider"), "Gemini"))
    //     .first();
    // } else {
    //   encryptedApiKey = await ctx.db
    //     .query("userApiKeys")
    //     .withIndex("by_user", (q) => q.eq("user_id", identity.subject))
    //     .filter((q) => q.eq(q.field("provider"), "Groq"))
    //     .first();
    // }

    // if (encryptedApiKey === null) throw new Error("No appropriate api key");

    const encryptionKeys = await ctx.db
      .query("userEncryptionKeys")
      .withIndex("by_user", (q) => q.eq("user_id", identity.subject))
      .first();

    if (encryptionKeys == null) throw new Error("No encryption keys provided");

    console.log(`Model Selected ${model}`);

    if (fileSupportedLLMs.includes(model)) {
      await ctx.scheduler.runAfter(0, internal.streaming.streamWithFiles, {
        messageId: message_id,
        messages: history,
        model: model,
        encryptedApiKey: encryptedApiKey,
        entropy: encryptionKeys.entropy,
        salt: encryptionKeys.salt,
        createdAt: encryptionKeys._creationTime,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.streaming.streamFullText, {
        messageId: message_id,
        messages: history,
        model: model,
        encryptedApiKey: encryptedApiKey,
        entropy: encryptionKeys.entropy,
        salt: encryptionKeys.salt,
        createdAt: encryptionKeys._creationTime,
      });
    }
  },
});

export const saveUserMessage = mutation({
  args: {
    chat_id: v.id("chats"),
    userMessage: coreMessage,
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const idendity = await ctx.auth.getUserIdentity();
    if (!idendity) throw new Error("Not authenticated!");

    const { chat_id, userMessage, model } = args;

    await ctx.db.insert("messages", {
      author_id: idendity.subject,
      chat_id,
      message: userMessage,
      isComplete: true,
      error: false,
      model: model,
    });
  },
});

export const initiateMessage = mutation({
  args: {
    chat_id: v.id("chats"),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const idenity = await ctx.auth.getUserIdentity();
    if (!idenity) throw new Error("Not authenticated!");

    const { chat_id, model } = args;

    const message_id = await ctx.db.insert("messages", {
      author_id: idenity.subject,
      chat_id: chat_id,
      message: { role: "assistant", content: "" },
      isComplete: false,
      error: false,
      model: model,
    });

    return message_id;
  },
});

export const getMessages = query({
  args: { conversationId: v.id("chats") },
  handler: async (ctx, args) => {
    // return all the messages for the appropirate conversation
    const conversation_id = args.conversationId;

    // const messages = await ctx.db
    //   .query("messages")
    //   .filter((q) => q.eq(q.field("chat_id"), conversation_id))
    //   .collect();

    const optimalMessages = await ctx.db
      .query("messages")
      .withIndex("by_chatId", (q) => q.eq("chat_id", conversation_id))
      .collect();

    return optimalMessages;
  },
});

export const updateMessageRoute = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const idenity = await ctx.auth.getUserIdentity();
    if (!idenity) throw new Error("Not authenticated");
    const messageId = args.messageId;
    const content = args.content;

    await ctx.db.patch(messageId, {
      message: {
        content: content,
        role: "assistant",
      },
    });
  },
});

export const updateMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = args.messageId;
    const content = args.content;

    await ctx.db.patch(messageId, {
      message: {
        content: content,
        role: "assistant",
      },
    });
  },
});

export const errorMessage = mutation({
  args: {
    messageId: v.id("messages"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const identiy = await ctx.auth.getUserIdentity();
    if (!identiy) throw new Error("Not authenticated");

    const { messageId, errorMessage } = args;
    
    await ctx.db.patch(messageId, {
      error: true,
      errorMessage: errorMessage,
    });
  }
})

export const completeMessageRoute = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    // update appropriate message with the completed status
    const messageId = args.messageId;

    await ctx.db.patch(messageId, { isComplete: true });
  },
});

export const completeMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const idenity = await ctx.auth.getUserIdentity();
    if (!idenity) throw new Error("Not authenticated");
    // update appropriate message with the completed status
    const messageId = args.messageId;

    await ctx.db.patch(messageId, { isComplete: true });
  },
});

export const regnerateResponse = mutation({
  args: {
    conversationId: v.id("chats"),
    history: v.array(coreMessage),
    model: v.string(),
    messageIdsToDelete: v.array(v.id("messages")),
    useageId: v.id("useage"),
    credits: v.number(),
    encryptedApiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) throw new Error("Not authenticated");

    const {
      conversationId,
      history,
      model,
      messageIdsToDelete,
      useageId,
      credits,
      encryptedApiKey,
    } = args;

    // delete all the subsequent messages
    for (const id of messageIdsToDelete) {
      await ctx.db.delete(id);
    }
    // increase credits by 1 so a regnerate doesn't use up 1 credit
    const newCredit = credits + 1;

    // create the regenerated message
    await ctx.runMutation(api.messages.sendMessage, {
      conversationId: conversationId,
      history: history,
      model: model,
      useageId: useageId,
      credits: newCredit,
      encryptedApiKey: encryptedApiKey,
    });
  },
});
