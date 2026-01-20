import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const initiateUser = internalMutation({
  args: {
    externalId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const { externalId, email } = args;

    const userByExternalId = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", externalId))
      .unique();

    if (userByExternalId !== null) throw new ConvexError("User already exists");

    console.log(`Signing up ${externalId}: ${email}`);

    const userId = await ctx.db.insert("users", {
      email: email,
      externalId,
    });

    await ctx.db.insert("usage", {
      userId,
      messagesRemaining: 50,
    });
  },
});

export const upsertUser = internalMutation({
  args: {
    externalId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const { externalId, email } = args;

    const userByExternalId = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", externalId))
      .unique();

    if (userByExternalId !== null) {
      await ctx.db.patch(userByExternalId._id, { email: email });
      return;
    }

    const userId = await ctx.db.insert("users", {
      email: email,
      externalId,
    });

    await ctx.db.insert("usage", {
      userId,
      messagesRemaining: 50,
    });
  },
});

export const deleteUser = internalMutation({
  args: {
    externalId: v.string(),
  },
  handler: async (ctx, args) => {
    const { externalId } = args;

    const userByExternalId = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", externalId))
      .unique();

    if (userByExternalId === null) throw new ConvexError("User not found");

    const chats = await ctx.db
      .query("chats")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userByExternalId._id))
      .collect();

    // go through all of user chats
    for (const chat of chats) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_chatId", (q) => q.eq("chatId", chat._id))
        .collect();

      // delete all messages for respective chat
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      // delete any invitations related to chat

      const invitations = await ctx.db
        .query("invites")
        .withIndex("by_chatId", (q) => q.eq("chatId", chat._id))
        .collect();

      for (const invite of invitations) {
        await ctx.db.delete(invite._id);
      }

      // delete chat
      await ctx.db.delete(chat._id);
    }

    // delete useage record
    const usageRecord = await ctx.db
      .query("usage")
      .withIndex("by_userId", (q) => q.eq("userId", userByExternalId._id))
      .unique();

    if (usageRecord === null)
      throw new ConvexError("Failed to find user usage record");

    await ctx.db.delete(usageRecord._id);

    // delete encryption keys

    const userEncryptionKeys = await ctx.db
      .query("userEncryptionKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userByExternalId._id))
      .collect();

    for (const key of userEncryptionKeys) {
      await ctx.db.delete(key._id);
    }

    // delete user api keys

    const userApiKeys = await ctx.db
      .query("userApiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userByExternalId._id))
      .collect();

    for (const key of userApiKeys) {
      await ctx.db.delete(key._id);
    }

    // delete file references
    const files = await ctx.db
      .query("files")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userByExternalId._id))
      .collect();

    for (const file of files) {
      await ctx.db.delete(file._id);

      if (file.key !== undefined)
        await ctx.scheduler.runAfter(
          0,
          internal.utils.files.deleteUploadThingFile,
          {
            key: file.key,
          },
        );
    }

    // delete user
    await ctx.db.delete(userByExternalId._id);
  },
});

export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const externalId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", externalId))
      .unique();

    if (user === null) throw new Error("User not found");

    const remainingCredits = await ctx.db
      .query("usage")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    return remainingCredits;
  },
});

export const updateUseage = mutation({
  args: {
    usageId: v.id("usage"),
    credits: v.number(),
  },
  handler: async (ctx, args) => {
    const idenity = await ctx.auth.getUserIdentity();
    if (!idenity) throw new Error("Not authenticated!");

    const { usageId, credits } = args;

    await ctx.db.patch(usageId, { messagesRemaining: credits });
  },
});
