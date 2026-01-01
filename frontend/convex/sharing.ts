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
    if (identity === null) throw new Error("Not authenticated");

    const email = identity.email;
    if (email === undefined) throw new Error("Failed to get user email");
    
    const { recipient_email, chat_id, chat_name } = args;

    const chat = await ctx.db.get(chat_id);
    if ( chat === null ) throw new Error("Failed to find chat");

    const chatOwnerId = chat.user_id;

    const acceptedInvites = await ctx.db
      .query("invites")
      .withIndex("by_chat_id", (q) => q.eq("chat_id", chat._id))
      .filter((q) => q.eq(q.field("chat_id"), chat._id))
      .collect();

    const invitees = acceptedInvites.map((invitee) => invitee.author_email);

    const allowedToShare = [...invitees, chatOwnerId];
    if ( !allowedToShare.includes(email) ) throw new Error("Not authorized to share chat");
    

    const recipient = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("email"), recipient_email))
    .first();
    
    if ( recipient === undefined ) throw new Error("Failed to find recipient");
    if ( allowedToShare.includes(recipient_email) ) throw new Error("Chat already shared with user");
    
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
    if (identity === null) throw new Error("Not authenticated");

    const email = identity.email;
    if ( email === undefined ) throw new Error("Failed to get user email");

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
    if ( identity === null) throw new Error("Not authenticated");

    const email = identity.email;
    if ( email === undefined ) throw new Error("Failed to get user email");


    const invites = await ctx.db
      .query("invites")
      .withIndex("by_recipient_email", (q) => q.eq("recipient_email", email))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const chatIds = invites.map((invite) => invite.chat_id);

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
    if ( identity === null ) throw new Error("Not authenticated");

    const email = identity.email;
    if ( email === undefined ) throw new Error("Failed to get user email");

    const { invitation_id } = args;
    const invitation = await ctx.db.get(invitation_id);

    if ( invitation === null) throw new Error("Failed to get invitation");

    if ( invitation.recipient_email !== email ) throw new Error("Not authorized to accept this invitation");

    await ctx.db.patch(invitation_id, { status: "accepted" });
  },
});

export const denyInvitation = mutation({
  args: {
    invitation_id: v.id("invites"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if ( identity === null ) {
      throw new Error("Not authenticated");
    }

    const email = identity.email;
    if ( email === undefined ) throw new Error("Failed to get user email");

    const { invitation_id } = args;
    const invitation = await ctx.db.get(invitation_id);

    if ( invitation === null ) throw new Error("Failed to get invitation");

    if ( invitation.recipient_email !== email ) throw new Error("Not authorized to deny this invitation");

    await ctx.db.delete(invitation_id);
  },
});

export const leaveSharedChat = mutation({
  args: {
    chat_id: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    const email = identity.email;
    if ( email === undefined ) throw new Error("Failed to get user email");

    const { chat_id } = args;

    const invitation = await ctx.db
      .query("invites")
      .withIndex("by_recipient_email", (q) => q.eq("recipient_email", email))
      .filter((q) => q.eq(q.field("chat_id"), chat_id))
      .first();

    if (invitation === null) throw new Error("Invitation not found");

    if ( email !== invitation.recipient_email ) throw new Error("Not authorized to leave shared chat");

    await ctx.db.delete(invitation._id);
  },
});
