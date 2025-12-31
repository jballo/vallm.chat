import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createInvitation = mutation({
  args: {
    recipient_email: v.string(),
    chat_id: v.id("chats"),
    chat_name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const email = identity.email;
    if (!email) {
      throw new Error("Failed to get user email");
    }

    const { recipient_email, chat_id, chat_name } = args;

    await ctx.db.insert("invites", {
      recipient_email: recipient_email,
      author_email: email,
      chat_id: chat_id,
      chat_name: chat_name,
      status: "pending",
    });
  },
});

export const getPendingInvitations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const email = identity.email;
    if (!email) {
      throw new Error("Failed to get user email");
    }

    // const invites = await ctx.db
    //   .query("invites")
    //   .filter((q) => q.eq(q.field("recipient_email"), email))
    // .filter((q) => q.eq(q.field("status"), "pending"))
    //   .collect();

    const optimalInvites = await ctx.db
      .query("invites")
      .withIndex("by_recipient_email", (q) => q.eq("recipient_email", email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return optimalInvites;
  },
});

export const getAcceptedChats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const email = identity.email;
    if (!email) {
      throw new Error("Failed to get user email");
    }

    // const invites = await ctx.db
    //   .query("invites")
    //   .filter((q) => q.eq(q.field("recipient_email"), email))
    //   .filter((q) => q.eq(q.field("status"), "accepted"))
    //   .collect();

    const optimalInvites = await ctx.db
      .query("invites")
      .withIndex("by_recipient_email", (q) => q.eq("recipient_email", email))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const chatIds = optimalInvites.map((invite) => invite.chat_id);

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
    invitation_id: v.id("invites"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const { invitation_id } = args;

    await ctx.db.patch(invitation_id, { status: "accepted" });
  },
});

export const denyInvitation = mutation({
  args: {
    invitation_id: v.id("invites"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }
    
    const { invitation_id } = args;

    await ctx.db.delete(invitation_id);
  },
});

export const leaveSharedChat = mutation({
  args: {
    chat_id: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const email = identity.email;
    if (!email) {
      throw new Error("Failed to get user email");
    }

    const { chat_id } = args;

    // const invite = await ctx.db
    //   .query("invites")
    // .filter((q) => q.eq(q.field("chat_id"), chat_id))
    //   .first();

    const optimalInvite = await ctx.db
      .query("invites")
      .withIndex("by_recipient_email", (q) => q.eq("recipient_email", email))
      .filter((q) => q.eq(q.field("chat_id"), chat_id))
      .first();

    if (!optimalInvite) throw new Error("Invitation not found");

    await ctx.db.delete(optimalInvite._id);
  },
});
