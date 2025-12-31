import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { coreMessage } from "./schema/types";
// import { api } from "./_generated/api";


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
      // old fields
      author_id: idendity.subject,
      chat_id,
      message: userMessage,
      isComplete: true,
      error: false,
      model: model,

      // new fields
      authorId: idendity.subject,
      chatId: chat_id,
      modelId: model,
      hasError: false,
      payload: userMessage,
      isStreaming: false,
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
      // old fields
      author_id: idenity.subject,
      chat_id: chat_id,
      message: { role: "assistant", content: "" },
      isComplete: false,
      error: false,
      model: model,
      // new fields
      authorId: idenity.subject,
      chatId: chat_id,
      modelId: model,
      hasError: false,
      payload: { role: "assistant", content: "" },
      isStreaming: true,
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
      .withIndex("by_chatId", (q) => q.eq("chatId", conversation_id))
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
      // old field
      message: {
        content: content,
        role: "assistant",
      },
      // new field
      payload: {
        content: content,
        role: "assistant",
      }
    });
  },
});

export const completeMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const idenity = await ctx.auth.getUserIdentity();
    if (!idenity) throw new Error("Not authenticated");
    // update appropriate message with the completed status
    const messageId = args.messageId;

    await ctx.db.patch(messageId, { 
      // old field
      isComplete: true,
      // new field
      isStreaming: false,
    });
  },
});

// export const regnerateResponse = mutation({
//   args: {
//     conversationId: v.id("chats"),
//     history: v.array(coreMessage),
//     model: v.string(),
//     messageIdsToDelete: v.array(v.id("messages")),
//     useageId: v.id("useage"),
//     credits: v.number(),
//     encryptedApiKey: v.string(),
//   },
//   handler: async (ctx, args) => {
//     const identity = await ctx.auth.getUserIdentity();

//     if (!identity) throw new Error("Not authenticated");

//     const {
//       conversationId,
//       history,
//       model,
//       messageIdsToDelete,
//       useageId,
//       credits,
//       encryptedApiKey,
//     } = args;

//     // delete all the subsequent messages
//     for (const id of messageIdsToDelete) {
//       await ctx.db.delete(id);
//     }
//     // increase credits by 1 so a regnerate doesn't use up 1 credit
//     const newCredit = credits + 1;

//     // create the regenerated message
//     await ctx.runMutation(api.messages.sendMessage, {
//       conversationId: conversationId,
//       history: history,
//       model: model,
//       useageId: useageId,
//       credits: newCredit,
//       encryptedApiKey: encryptedApiKey,
//     });
//   },
// });
