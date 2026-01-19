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
  v.array(v.union(coreTextPart, coreImagePart, coreFilePart)),
);

const coreMessage = v.object({
  role: v.union(
    v.literal("system"),
    v.literal("user"),
    v.literal("assistant"),
    v.literal("tool"),
  ),
  content: coreContent,
});

const scryptSyncParams = v.object({
  N: v.number(),
  r: v.number(),
  p: v.number(),
});

// argon2 params for later use
// const argon2Params = v.object({
//   m: v.number(),
//   t: v.number(),
//   p: v.number(),
// });

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
    email: v.string(),
    // new field
    externalId: v.string(), // currently clerk
  })
    .index("by_ExternalId", ["externalId"])
    .index("by_Email", ["email"]),
  chats: defineTable({
    title: v.string(),
    ownerId: v.id("users"),
  }).index("by_ownerId", ["ownerId"]),
  files: defineTable({
    name: v.string(),
    url: v.string(),
    mimeType: v.string(),
    size: v.number(),
    ownerId: v.id("users"),
    key: v.string(),
  }).index("by_ownerId", ["ownerId"]),
  messages: defineTable({
    // New fields
    chatId: v.id("chats"),
    modelId: v.string(),
    hasError: v.boolean(),
    errorDetail: v.optional(v.string()),
    payload: coreMessage,
    isStreaming: v.boolean(),
    ownerId: v.id("users"),
  })
    .index("by_owner", ["ownerId"])
    .index("by_chatId", ["chatId"]),
  invites: defineTable({
    recipientUserId: v.id("users"),
    authorUserId: v.id("users"),
    chatId: v.id("chats"),
    chatName: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
    ),
  })
    .index("by_recipientUserId", ["recipientUserId"])
    .index("by_authorUserId", ["authorUserId"])
    .index("by_recipientUserId_status", ["recipientUserId", "status"])
    .index("by_chatId", ["chatId"]),
  useage: defineTable({
    messagesRemaining: v.number(),
    userId: v.optional(v.id("users")),
  }).index("by_userId", ["userId"]),
  userEncryptionKeys: defineTable({
    userId: v.id("users"),
    entropy: v.string(),
    salt: v.string(),
    version: v.string(),
    kdf_name: v.literal("scrypt"), // add argon2 later
    params: scryptSyncParams, // argon2 params add later,
  }).index("by_userId", ["userId"]),
  userApiKeys: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    encryptedApiKey: v.string(),
    derivedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_user_provider", ["userId", "provider"]),
});
