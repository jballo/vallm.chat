import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createInvitation = mutation({
  args: {
    recipientEmail: v.string(),
    chatId: v.id("chats"),
    chatName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    const owner = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (owner === null) throw new Error("Author of chat not found");

    const { recipientEmail, chatId } = args;

    const chat = await ctx.db.get(chatId);
    if (chat === null) throw new Error("Failed to find chat");

    if (owner._id !== chat.ownerId)
      throw new Error("Not authorized to share chat");

    const recipient = await ctx.db
      .query("users")
      .withIndex("by_Email", (q) => q.eq("email", recipientEmail))
      .unique();

    if (recipient === null) throw new Error("Failed to find recipient");

    const invitation = await ctx.db
      .query("invites")
      .withIndex("by_recipientUserId", (q) =>
        q.eq("recipientUserId", recipient._id),
      )
      .filter((q) => q.eq(q.field("chatId"), chat._id))
      .first();

    if (invitation !== null) throw new Error("Chat already shared with user");

    await ctx.db.insert("invites", {
      recipientUserId: recipient._id,
      authorUserId: owner._id,
      chatId,
      chatName: chat.title,
      status: "pending",
    });
  },
});

export const getPendingInvitations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    const recipient = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (recipient === null) throw new Error("Recipient not found");

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_recipientUserId_status", (q) =>
        q.eq("recipientUserId", recipient._id).eq("status", "pending"),
      )
      .collect();

    const addedEmailInvites = (
      await Promise.all(
        invites.map(async (invite) => {
          const author = await ctx.db.get(invite.authorUserId);

          if (author !== null) {
            return {
              ...invite,
              authorEmail: author.email,
            };
          }
        }),
      )
    ).filter((invite) => invite !== undefined);

    return addedEmailInvites;
  },
});

export const getAcceptedChats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    const recipient = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (recipient === null) throw new Error("Recipient not found");

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_recipientUserId_status", (q) =>
        q.eq("recipientUserId", recipient._id).eq("status", "pending"),
      )
      .collect();

    const chatIds = invites.map((invite) => invite.chatId);

    if (chatIds.length === 0) return [];

    const chats = await ctx.db
      .query("chats")
      .filter((q) => q.or(...chatIds.map((id) => q.eq(q.field("_id"), id))))
      .collect();

    return chats;
  },
});

export const acceptInvitation = mutation({
  args: {
    invitationId: v.id("invites"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    const recipient = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (recipient === null) throw new Error("Recipient not found");

    const { invitationId } = args;
    const invitation = await ctx.db.get(invitationId);

    if (invitation === null) throw new Error("Failed to get invitation");

    if (invitation.recipientUserId !== recipient._id)
      throw new Error("Not authorized to accept this invitation");

    await ctx.db.patch(invitationId, { status: "accepted" });
  },
});

export const denyInvitation = mutation({
  args: {
    invitationId: v.id("invites"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    const recipient = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (recipient === null) throw new Error("Recipient not found");

    const { invitationId } = args;
    const invitation = await ctx.db.get(invitationId);

    if (invitation === null) throw new Error("Failed to get invitation");

    if (invitation.recipientUserId !== recipient._id)
      throw new Error("Not authorized to deny this invitation");

    await ctx.db.delete(invitation._id);
  },
});

export const leaveSharedChat = mutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    const recipient = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (recipient === null) throw new Error("Recipient not found");

    const { chatId } = args;

    const invitation = await ctx.db
      .query("invites")
      .withIndex("by_recipientUserId", (q) =>
        q.eq("recipientUserId", recipient._id),
      )
      .filter((q) => q.eq(q.field("chatId"), chatId))
      .first();

    if (invitation === null) throw new Error("Invitation not found");

    await ctx.db.delete(invitation._id);
  },
});
