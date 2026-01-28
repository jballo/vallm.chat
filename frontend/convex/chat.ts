import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const hybridSaveChat = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    const { title } = args;

    const user = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (user === null) throw new Error("Failed to find user");

    const chatId = await ctx.db.insert("chats", {
      ownerId: user._id,
      title,
    });

    const chatCreated = await ctx.db.get(chatId);

    if (chatCreated === null) throw new Error("Failed to create chat");

    return chatId;
  },
});

export const getChats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (user === null) throw new Error("Failed to find user");

    const optimalChats = await ctx.db
      .query("chats")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();

    return optimalChats;
  },
});

export const deleteChat = mutation({
  args: { conversationId: v.id("chats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (user === null) throw new Error("User not found");

    const { conversationId } = args;

    const chat = await ctx.db.get(conversationId);

    if (chat === null) throw new Error("Chat not found");

    if (chat.ownerId !== user._id)
      throw new Error("Not authorized to delete chat");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chatId", (q) => q.eq("chatId", conversationId))
      .collect();

    // delete chat messsages for appropriate chat
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // collect invitations for appropriate chat
    const invitations = await ctx.db
      .query("invites")
      .withIndex("by_chatId", (q) => q.eq("chatId", conversationId))
      .collect();

    // delte invitations for chat
    for (const invite of invitations) {
      await ctx.db.delete(invite._id);
    }

    // delete chat
    await ctx.db.delete(conversationId);
  },
});

export const branchChat = mutation({
  args: {
    title: v.string(),
    conversationId: v.id("chats"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (user === null) throw new Error("Failed to find user");

    const { title, conversationId, messageId } = args;

    const chat = await ctx.db.get(conversationId);

    if (chat === null) throw new Error("Chat not found");

    if (chat.ownerId !== user._id)
      throw new Error("Not authorized to branch chat");

    const newConversationId = await ctx.db.insert("chats", {
      ownerId: user._id,
      title: title,
    });

    const all_messages = await ctx.db
      .query("messages")
      .withIndex("by_chatId", (q) => q.eq("chatId", conversationId))
      .order("asc")
      .collect();

    // find the position of the message on the chronological order
    const targetIndex = all_messages.findIndex((msg) => msg._id === messageId);

    const messages =
      targetIndex !== -1
        ? all_messages.slice(0, targetIndex + 1) // include target message
        : all_messages; // if not found, copy all

    for (const msg of messages) {
      await ctx.db.insert("messages", {
        chatId: newConversationId,
        modelId: msg.modelId,
        hasError: msg.hasError,
        errorDetail: msg.errorDetail,
        payload: msg.payload,
        isStreaming: msg.isStreaming,
        ownerId: msg.ownerId,
      });
    }
  },
});
