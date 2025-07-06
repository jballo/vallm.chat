import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

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

export const saveEncryptionKeys = internalMutation({
  args: {
    user_id: v.string(),
    entropy: v.string(),
    salt: v.string(),
  },
  handler: async (ctx, args) => {
    const { user_id, entropy, salt } = args;

    const recordId = await ctx.db.insert("userEncryptionKeys", {
      user_id: user_id,
      entropy: entropy,
      salt: salt,
    });
    const encryptionKeys = await ctx.db.get(recordId);

    return encryptionKeys;
  },
});

export const saveEncryptedApiKey = internalMutation({
  args: {
    user_id: v.string(),
    provider: v.string(),
    encryptedApiKey: v.string(),
  },
  handler: async (ctx, args): Promise<{ action: string }> => {
    const { user_id, provider, encryptedApiKey } = args;

    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("user_id", user_id).eq("provider", provider)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedApiKey: encryptedApiKey,
      });
      return { action: "updated" };
    }
    const newUserApiKeysId = await ctx.db.insert("userApiKeys", {
      user_id: user_id,
      provider: provider,
      encryptedApiKey: encryptedApiKey,
    });

    const newUserApiKeys = await ctx.db.get(newUserApiKeysId);

    if (!newUserApiKeys) throw new Error("Failed to create new user api key");
    return { action: "created" };
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
