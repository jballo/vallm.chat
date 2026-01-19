import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// export const createChat = action({
//   args: {
//     history: v.array(coreMessage),
//     model: v.string(),
//     useageId: v.id("useage"),
//     credits: v.number(),
//     encryptedApiKey: v.string(),
//   },
//   async handler(ctx, args) {
//     const identity = await ctx.auth.getUserIdentity();
//     if (identity === null) {
//       throw new Error("Not authenticated");
//     }

//     const user_id = identity.subject;
//     const history = args.history;
//     const model = args.model;
//     const useageId = args.useageId;
//     const credits = args.credits;
//     const encryptedApiKey = args.encryptedApiKey;

//     const google = createGoogleGenerativeAI({
//       baseURL: "https://generativelanguage.googleapis.com/v1beta",
//       apiKey: process.env.GEMINI_KEY,
//     });

//     const { text } = await generateText({
//       model: google("gemini-2.0-flash-lite"),
//       system:
//         "Generate a four word title that describes the message the user will provider. NO LONGER THAN FOUR WORDS",
//       messages: history as CoreMessage[],
//     });

//     console.log("Title: ", text);

//     await ctx.runMutation(api.chat.saveChat, {
//       userId: user_id,
//       title: text,
//       history: history,
//       model: model,
//       useageId: useageId,
//       credits: credits,
//       encryptedApiKey: encryptedApiKey,
//     });
//   },
// });

// export const saveChat = mutation({
//   args: {
//     userId: v.string(),
//     title: v.string(),
//     history: v.array(coreMessage),
//     model: v.string(),
//     useageId: v.id("useage"),
//     credits: v.number(),
//     encryptedApiKey: v.string(),
//   },
//   handler: async (ctx, args) => {
//     const user_id = args.userId;
//     const generatedTitle = args.title;
//     const history = args.history;
//     const model = args.model;
//     const useageId = args.useageId;
//     const credits = args.credits;
//     const encryptedApiKey = args.encryptedApiKey;

//     const chat_id = await ctx.db.insert("chats", {
//       user_id: user_id,
//       title: generatedTitle,
//     });
//     console.log("chat_id: ", chat_id);

//     // create the message for the new chat

//     // await ctx.runMutation(api.messages.sendMessage, {
//     //   conversationId: chat_id,
//     //   history: history,
//     //   model: model,
//     //   useageId: useageId,
//     //   credits: credits,
//     //   encryptedApiKey: encryptedApiKey,
//     // });
//   },
// });

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

    console.log("Chats: ", optimalChats);

    return optimalChats;
  },
});

export const deleteChat = mutation({
  args: { conversationId: v.id("chats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity === null) throw new Error("Not authenticated");

    const { conversationId } = args;

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
