"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  decryptApiKey,
  deriveUserKey,
  encryptApiKey,
  generateEntropy,
  generateSalt,
} from "./utils/encryption";

export const saveApiKey = action({
  args: {
    provider: v.string(),
    apiKey: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; message: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { provider, apiKey } = args;

    let encryptionKeys = await ctx.runQuery(
      internal.keysMutations.getEncryptionKeys,
      {
        user_id: identity.subject,
      }
    );

    if (!encryptionKeys) {
      const entropy = generateEntropy();
      const salt = generateSalt();

      encryptionKeys = await ctx.runMutation(
        internal.keysMutations.saveEncryptionKeys,
        {
          user_id: identity.subject,
          entropy: entropy,
          salt: salt,
        }
      );
    }

    if (!encryptionKeys) {
      throw new Error("Failed to create encryption keys");
    }

    const derivedKey = deriveUserKey(
      encryptionKeys.entropy,
      encryptionKeys._creationTime,
      encryptionKeys.salt
    );

    const encryptedApiKey = encryptApiKey(apiKey, derivedKey);

    const result = await ctx.runMutation(
      internal.keysMutations.saveEncryptedApiKey,
      {
        user_id: identity.subject,
        provider: provider,
        encryptedApiKey: encryptedApiKey,
      }
    );

    return {
      success: true,
      message: `${provider} API key ${result.action}`,
    };
  },
});

export const getApiKey = action({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { provider } = args;

    const encryptionKeys = await ctx.runQuery(
      internal.keysMutations.getEncryptionKeys,
      {
        user_id: identity.subject,
      }
    );

    if (!encryptionKeys) throw new Error("No encryption keys found");

    const encryptedApiKey = await ctx.runQuery(
      internal.keysMutations.getEncryptedApiKey,
      {
        user_id: identity.subject,
        provider: provider,
      }
    );

    if (!encryptedApiKey) {
      return {
        success: false,
        message: `No API key found for ${provider}`,
      };
    }

    const derivedKey = deriveUserKey(
      encryptionKeys.entropy,
      encryptionKeys._creationTime,
      encryptionKeys.salt
    );

    const decryptedApiKey = decryptApiKey(
      encryptedApiKey.encryptedApiKey,
      derivedKey
    );

    return {
      success: true,
      apiKey: decryptedApiKey,
    };
  },
});

export const simpleDecryptKey = action({
  args: {
    encryptedApiKey: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; apiKey: string }> => {
    const { encryptedApiKey } = args;

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const encryptionKeys = await ctx.runQuery(
      internal.keysMutations.getEncryptionKeys,
      {
        user_id: identity.subject,
      }
    );

    if (!encryptionKeys) throw new Error("No encryption keys found");

    const derivedKey = deriveUserKey(
      encryptionKeys.entropy,
      encryptionKeys._creationTime,
      encryptionKeys.salt
    );

    const decryptedApiKey = decryptApiKey(encryptedApiKey, derivedKey);

    return {
      success: true,
      apiKey: decryptedApiKey,
    };
  },
});
