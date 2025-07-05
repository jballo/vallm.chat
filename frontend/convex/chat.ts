import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { CoreMessage, generateText } from "ai";
import { api } from "./_generated/api";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
// import { Redis } from "@upstash/redis";

const coreTextPart = v.object({
  type: v.literal("text"),
  text: v.string(),
});

const coreImagePart = v.object({
  type: v.literal("image"),
  image: v.string(), // url
  mimeType: v.optional(v.string()),
});

const coreFilePart = v.object({
  type: v.literal("file"),
  data: v.string(), // url
  mimeType: v.string(),
});

const coreContent = v.union(
  v.string(),
  v.array(v.union(coreTextPart, coreImagePart, coreFilePart))
);

const coreMessage = v.object({
  role: v.union(
    v.literal("system"),
    v.literal("user"),
    v.literal("assistant"),
    v.literal("tool")
  ),
  content: coreContent,
});

export const createChat = action({
  args: {
    history: v.array(coreMessage),
    model: v.string(),
    useageId: v.id("useage"),
    credits: v.number(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const user_id = identity.subject;
    const history = args.history;
    const model = args.model;
    const useageId = args.useageId;
    const credits = args.credits;

    const google = createGoogleGenerativeAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta",
      apiKey: process.env.GEMINI_KEY,
    });

    const { text } = await generateText({
      model: google("gemini-2.0-flash-lite"),
      system:
        "Generate a four word title that describes the message the user will provider. NO LONGER THAN FOUR WORDS",
      messages: history as CoreMessage[],
    });

    console.log("Title: ", text);

    await ctx.runMutation(api.chat.saveChat, {
      userId: user_id,
      title: text,
      history: history,
      model: model,
      useageId: useageId,
      credits: credits,
    });
  },
});

export const saveChat = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    history: v.array(coreMessage),
    model: v.string(),
    useageId: v.id("useage"),
    credits: v.number(),
  },
  handler: async (ctx, args) => {
    const user_id = args.userId;
    const generatedTitle = args.title;
    const history = args.history;
    const model = args.model;
    const useageId = args.useageId;
    const credits = args.credits;

    const chat_id = await ctx.db.insert("chats", {
      user_id: user_id,
      title: generatedTitle,
    });
    console.log("chat_id: ", chat_id);

    // create the message for the new chat

    await ctx.runMutation(api.messages.sendMessage, {
      conversationId: chat_id,
      history: history,
      model: model,
      useageId: useageId,
      credits: credits,
    });
  },
});

export const getChats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const user_id = identity.subject;

    // const chats = await ctx.db
    //   .query("chats")
    //   .filter((q) => q.eq(q.field("user_id"), user_id))
    //   .order("desc")
    //   .collect();

    const optimalChats = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .order("desc")
      .collect();

    console.log("Chats: ", optimalChats);

    return optimalChats;
  },
});

export const deleteChat = mutation({
  args: { conversationId: v.id("chats") },
  handler: async (ctx, args) => {
    const conversation_id = args.conversationId;

    // query messages for chat

    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("chat_id"), conversation_id))
      .collect();

    // delete chat messsages for appropriate chat
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // collect invitations for appropriate chat
    const invitations = await ctx.db
      .query("invites")
      .withIndex("by_chat_id", (q) => q.eq("chat_id", conversation_id))
      .collect();

    // delte invitations for chat
    for (const invite of invitations) {
      await ctx.db.delete(invite._id);
    }

    // delete chat
    await ctx.db.delete(conversation_id);
  },
});

export const uploadImages = mutation({
  args: {
    files: v.array(
      v.object({
        name: v.string(),
        url: v.string(),
        mimeType: v.string(),
        size: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const user_id = identity.subject;
    const files = args.files;
    const uploadedFiles: { type: string; data: string; mimeType: string }[] =
      [];

    for (const file of files) {
      await ctx.db.insert("files", {
        name: file.name,
        url: file.url,
        size: file.size,
        authorId: user_id,
        mimeType: file.mimeType,
      });
      uploadedFiles.push({
        type: "file",
        data: file.url,
        mimeType: file.mimeType,
      });
    }

    return uploadedFiles;
  },
});

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
    const { invitation_id } = args;

    await ctx.db.patch(invitation_id, { status: "accepted" });
  },
});

export const denyInvitation = mutation({
  args: {
    invitation_id: v.id("invites"),
  },
  handler: async (ctx, args) => {
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

export const branchChat = mutation({
  args: {
    title: v.string(),
    conversation_id: v.id("chats"),
    message_id: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }
    const user_id = identity.subject;

    const { title, conversation_id, message_id } = args;

    const new_conversation_id = await ctx.db.insert("chats", {
      user_id: user_id,
      title: title,
    });

    const all_messages = await ctx.db
      .query("messages")
      .withIndex("by_chatId", (q) => q.eq("chat_id", conversation_id))
      .order("asc")
      .collect();

    // find the position of the message on the chronological order
    const targetIndex = all_messages.findIndex((msg) => msg._id === message_id);

    const messages =
      targetIndex !== -1
        ? all_messages.slice(0, targetIndex + 1) // include target message
        : all_messages; // if not found, copy all

    for (const msg of messages) {
      await ctx.db.insert("messages", {
        author_id: msg.author_id,
        chat_id: new_conversation_id,
        message: msg.message,
        isComplete: msg.isComplete,
        model: msg.model,
      });
    }
  },
});

export const initateUser = mutation({
  args: {
    user_id: v.string(),
    user_email: v.string(),
  },
  handler: async (ctx, args) => {
    const { user_id, user_email } = args;

    console.log(`Signing up ${user_id}: ${user_email}`);

    await ctx.db.insert("users", {
      user_id: user_id,
      email: user_email,
    });

    await ctx.db.insert("useage", {
      user_id: user_id,
      messagesRemaining: 50,
    });
  },
});

export const getUseage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const remainingCredits = await ctx.db
      .query("useage")
      .withIndex("by_user_id", (q) => q.eq("user_id", userId))
      .unique();

    return remainingCredits;
  },
});
