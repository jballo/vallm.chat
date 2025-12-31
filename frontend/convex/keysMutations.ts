import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";

export const getEncryptionKeys = internalQuery({
  args: {
    user_id: v.string(),
  },
  handler: async (ctx, args) => {
    const { user_id } = args;

    return await ctx.db
      .query("userEncryptionKeys")
      .withIndex("by_user", (q) => q.eq("user_id", user_id))
      .first();
  },
});

export const ensureEncryptionKeys = internalMutation({
  args: {
    entropy: v.string(),
    salt: v.string(),
    version: v.string(),
    kdf_name: v.literal('scrypt'), // add argon2 later
    params: v.object({
      N: v.number(),
      r: v.number(),
      p: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const idendity = await ctx.auth.getUserIdentity();
    if (!idendity) throw new Error("Not authenticated");

    const { entropy, salt, version, kdf_name, params } = args;

    const encryptionKey = await ctx.db
      .query("userEncryptionKeys")
      .withIndex("by_user", (q) => q.eq("user_id", idendity.subject))
      .first();

    if (encryptionKey) {
      return encryptionKey;
    }

    const insertedKey = await ctx.db.insert("userEncryptionKeys", {
      user_id: idendity.subject,
      entropy,
      salt,
      version,
      kdf_name,
      params,
    });

    const insertedEncryptionKey = await ctx.db.get(insertedKey);

    return insertedEncryptionKey;

  }
})


export const ensureEncryptedApiKeys = internalMutation({
  args: {
    user_id: v.string(),
    provider: v.string(),
    encryptedApiKey: v.string(),
    derivedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { user_id, provider, encryptedApiKey, derivedAt } = args;

    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("user_id", user_id).eq("provider", provider)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedApiKey,
        derivedAt,
      })
      return await ctx.db.get(existing._id);
    }

    const encryptApiKeyId = await ctx.db.insert("userApiKeys", {
      user_id: user_id,
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
    user_id: v.string(),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const { user_id, provider } = args;

    return await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("user_id", user_id).eq("provider", provider)
      )
      .first();
  },
});

export const getAllApiKeys = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) throw new Error("User not authenticated");

    return await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("user_id", identity.subject))
      .collect();
  },
});

export const deleteApiKey = internalMutation({
  args: {
    keyId: v.id("userApiKeys"),
  },
  handler: async (ctx, args) => {
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
