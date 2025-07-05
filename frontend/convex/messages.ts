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

    await ctx.db.patch(useageId, { messagesRemaining: credits - 1 });

    console.log("Message: ", msg);

    await ctx.db.insert("messages", {
      author_id: user_id,
      chat_id: conversation_id,
      message: msg,
      isComplete: true,
      model: model,
    });

    const message_id = await ctx.db.insert("messages", {
      author_id: user_id,
      chat_id: conversation_id,
      message: { role: "assistant", content: "" },
      isComplete: false,
      model: model,
    });
    const fileSupportedLLMs = ["gemini-2.0-flash"];

    if (fileSupportedLLMs.includes(model)) {
      await ctx.scheduler.runAfter(0, internal.chat.streamWithFiles, {
        messageId: message_id,
        messages: history,
        model: model,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.chat.streamFullText, {
        messageId: message_id,
        messages: history,
        model: model,
      });
    }
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

export const updateMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // update appropriate message with the new content
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

export const completeMessage = internalMutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
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
  },
  handler: async (ctx, args) => {
    const {
      conversationId,
      history,
      model,
      messageIdsToDelete,
      useageId,
      credits,
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
    });
  },
});
