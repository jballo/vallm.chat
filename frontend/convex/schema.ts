import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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

const scryptSyncParams = v.object({
  N: v.number(),
  r: v.number(),
  p: v.number(),
});

const argon2Params = v.object({
  m: v.number(),
  t: v.number(),
  p: v.number(),
});


// const modelMessage = v.object({
//   role: v.union(
//     v.literal("system"),
//     v.literal("user"),
//     v.literal("assistant"),
//     v.literal("tool")
//   ),
//   content: coreContent,
// });

export default defineSchema({
  users: defineTable({
    user_id: v.string(),
    email: v.string(),
  }),
  chats: defineTable({
    user_id: v.string(),
    title: v.string(),
  }).index("by_user", ["user_id"]),
  files: defineTable({
    name: v.string(),
    url: v.string(),
    mimeType: v.string(),
    size: v.number(),
    authorId: v.string(),
  }).index("by_author", ["authorId"]),
  messages: defineTable({
    // Legacy fields
    author_id: v.string(),
    chat_id: v.id("chats"),
    message: coreMessage,
    isComplete: v.boolean(),
    error: v.boolean(),
    errorMessage: v.optional(v.string()),
    model: v.optional(v.string()),
    // New fields
    authorId: v.optional(v.string()),
    chatId: v.optional(v.id("chats")),
    modelId: v.optional(v.string()),
    hasError: v.optional(v.boolean()),
    errorDetail: v.optional(v.string()),
    payload: v.optional(coreMessage),
    isStreaming: v.optional(v.boolean()),
  })
    .index("by_author", ["author_id"])
    .index("by_chat_Id", ["chat_id"])
    .index("by_chatId", ["chatId"]),
  invites: defineTable({
    recipient_email: v.string(),
    author_email: v.string(),
    chat_id: v.id("chats"),
    chat_name: v.string(),
    status: v.string(),
  })
    .index("by_recipient_email", ["recipient_email"])
    .index("by_chat_id", ["chat_id"]),
  useage: defineTable({
    user_id: v.string(),
    messagesRemaining: v.number(),
  }).index("by_user_id", ["user_id"]),
  userEncryptionKeys: defineTable({
    user_id: v.string(),
    entropy: v.string(),
    salt: v.string(),
    version: v.string(),
    kdf_name: v.union(v.literal('scrypt'), v.literal('argon2')),
    params: v.union(scryptSyncParams, argon2Params),
  }).index("by_user", ["user_id"]),
  userApiKeys: defineTable({
    user_id: v.string(),
    provider: v.string(),
    encryptedApiKey: v.string(),
    derivedAt: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_user_provider", ["user_id", "provider"]),
});
