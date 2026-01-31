import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";

export const getEncryptionKeys = internalQuery({
  handler: async (ctx) => {
    // const { user_id } = args;
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (user === null) throw new Error("User not found");

    return await ctx.db
      .query("userEncryptionKeys")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
  },
});

export const ensureEncryptionKeys = internalMutation({
  args: {
    entropy: v.string(),
    salt: v.string(),
    version: v.string(),
    kdf_name: v.literal("scrypt"), // add argon2 later
    params: v.object({
      N: v.number(),
      r: v.number(),
      p: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (user === null) throw new Error("User not found");

    const { entropy, salt, version, kdf_name, params } = args;

    const encryptionKey = await ctx.db
      .query("userEncryptionKeys")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (encryptionKey) {
      return encryptionKey;
    }

    const insertedKey = await ctx.db.insert("userEncryptionKeys", {
      userId: user._id,
      entropy,
      salt,
      version,
      kdf_name,
      params,
    });

    const insertedEncryptionKey = await ctx.db.get(insertedKey);

    return insertedEncryptionKey;
  },
});

export const ensureEncryptedApiKeys = internalMutation({
  args: {
    provider: v.string(),
    encryptedApiKey: v.string(),
    derivedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (user === null) throw new Error("User not found");

    const { provider, encryptedApiKey, derivedAt } = args;

    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", user._id).eq("provider", provider),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedApiKey,
        derivedAt,
      });
      return await ctx.db.get(existing._id);
    }

    const encryptApiKeyId = await ctx.db.insert("userApiKeys", {
      userId: user._id,
      provider: provider,
      encryptedApiKey: encryptedApiKey,
      derivedAt,
    });

    const newUserApiKeys = await ctx.db.get(encryptApiKeyId);

    return newUserApiKeys;
  },
});

export const getEncryptedApiKey = internalQuery({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (user === null) throw new Error("User not found");

    const { provider } = args;

    return await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", user._id).eq("provider", provider),
      )
      .first();
  },
});

export const getAllApiKeys = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_ExternalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (user === null) throw new Error("User not found");

    return await ctx.db
      .query("userApiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const deleteApiKey = internalMutation({
  args: {
    keyId: v.id("userApiKeys"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new Error("Not authenticated");

    const { keyId } = args;

    await ctx.db.delete(keyId);

    const isDeleted = await ctx.db.get(keyId);

    if (isDeleted !== null) {
      return {
        success: false,
      };
    }
    return {
      success: true,
    };
  },
});
