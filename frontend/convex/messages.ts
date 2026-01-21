import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { coreMessage } from "./schema/types";
// import { api } from "./_generated/api";

export const saveUserMessage = mutation({
  args: {
    chatId: v.id("chats"),
    userMessage: coreMessage,
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated!");

    const { chatId, userMessage, modelId } = args;

    const author = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (author === null) throw new Error("Author not found");

    await ctx.db.insert("messages", {
      ownerId: author._id,
      chatId,
      modelId,
      hasError: false,
      payload: userMessage,
      isStreaming: false,
    });
  },
});

export const initiateMessage = mutation({
  args: {
    chatId: v.id("chats"),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated!");

    const author = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (author === null) throw new Error("Author not found");

    const { chatId, modelId } = args;

    const message_id = await ctx.db.insert("messages", {
      ownerId: author._id,
      chatId,
      modelId,
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
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");
    const { conversationId } = args;

    const user = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (user === null) throw new Error("User not found");

    const conversation = await ctx.db.get(conversationId);
    if (conversation === null) throw new Error("Conversation not found");

    const ownerId = conversation.ownerId;

    const acceptedInvitations = await ctx.db
      .query("invites")
      .withIndex("by_chatId", (q) => q.eq("chatId", conversationId))
      .filter(q => q.eq(q.field("status"), "accepted"))
      .collect();

    const acceptedInviteeIds = acceptedInvitations.map(invitation => {
      return invitation.recipientUserId
    });

    const authorizedUsers = [ownerId, ...acceptedInviteeIds];

    if(!authorizedUsers.includes(user._id)) throw new Error("User not authorized");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chatId", (q) => q.eq("chatId", conversationId))
      .collect();

    return messages;
  },
});

export const updateMessageRoute = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");
    const { messageId, content } = args;

    await ctx.db.patch(messageId, {
      payload: {
        content: content,
        role: "assistant",
      },
    });
  },
});

export const completeMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    const { messageId } = args;

    await ctx.db.patch(messageId, {
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
