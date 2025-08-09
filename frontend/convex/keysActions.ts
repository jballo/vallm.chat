"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  decryptApiKey,
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
  ): Promise<{ success: true; message: string } | { success: false, error: "NOT_AUTHENTICATED" | "FAILED_TO_SAVE" | "NO_ENCRYPTION_KEY" | "ENCRYPTION_FAILURE" | "ENCRYPTED_API_KEY_NO_SAVE" | "INVALID_FORMAT"}> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { success: false, error: "NOT_AUTHENTICATED"}

    try {
      const { provider, apiKey } = args;

      const entropy = generateEntropy();
      const salt = generateSalt();
      const version = "v1";
      const kdf_name = "scrypt";
      const params = { N: 16384, r: 8, p: 1, };

      const encryptionKey = await ctx.runMutation(internal.keysMutations.ensureEncryptionKeys, {
        entropy,
        salt,
        version,
        kdf_name,
        params,
      });

      if (!encryptionKey) {
        return { success: false, error: "NO_ENCRYPTION_KEY" };
      }

      if (typeof encryptionKey._creationTime !== "number") {
        console.error(`[saveApiKey]: _createTime for encryptionKey is not a number`);
        return { success: false, error: "INVALID_FORMAT" };
      }

      const encryptedApiKey = encryptApiKey(
        apiKey,
        encryptionKey.entropy,
        encryptionKey._creationTime,
        encryptionKey.salt,
        encryptionKey.version,
        encryptionKey.kdf_name,
        encryptionKey.params,
      );

      if (encryptedApiKey.success === false) {
        console.error(`[saveApiKey]: ${encryptedApiKey.error}`);
        return { success: false, error: "ENCRYPTION_FAILURE" };
      }
  
      const result = await ctx.runMutation(
        internal.keysMutations.ensureEncryptedApiKeys,
        {
          user_id: identity.subject,
          encryptedApiKey: encryptedApiKey.encryptedKey,
          provider: provider,
        }
      );

      if (result === null) {
        console.error(`[saveApiKey]: FAILED TO SAVE ENCRYPTED API KEY`);
        return { success: false, error: "ENCRYPTED_API_KEY_NO_SAVE" };
      }
  
      return {
        success: true,
        message: `${provider} API key saveds`,
      };
    } catch (error) {
      console.log(`[saveApiKey]: ${error}`);
      return {
        success: false,
        error: "FAILED_TO_SAVE",
      }
    }

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

    const decryptedApiKey = decryptApiKey(
      encryptedApiKey.encryptedApiKey,
      encryptionKeys.entropy,
      encryptionKeys.salt,
      encryptionKeys._creationTime,
      encryptionKeys.kdf_name,
      encryptionKeys.params
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
  handler: async (ctx, args): Promise<{ success: true; apiKey?: string; } | { success: false; error: "NO_IDENTITY" | "NO_KEYS" | "DECRYPTION_ERROR" | "INVALID_FORMAT"; }> => {
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { success: false, error: "NO_IDENTITY" }


    const { encryptedApiKey } = args;

    try {
      const encryptionKeys = await ctx.runQuery(
        internal.keysMutations.getEncryptionKeys,
        {
          user_id: identity.subject,
        }
      );
  
      if (!encryptionKeys) return { success: false, error: "NO_KEYS" };
  
      const decryptedApiKey = decryptApiKey(
        encryptedApiKey,
        encryptionKeys.entropy,
        encryptionKeys.salt,
        encryptionKeys._creationTime,
        encryptionKeys.kdf_name,
        encryptionKeys.params,
      );

      if (decryptedApiKey.success === false) throw new Error("DECRYPTION_ERROR");
  
      return { success: true, apiKey: decryptedApiKey.apiKey };

    } catch (error) {
      console.error("Error: ", error);
      console.error("[simpleDecryptKey] Decryption error", {
        error,
        userId: identity.subject,
        encryptedApiKey,
      });

      return { success: false, error: "DECRYPTION_ERROR" };
    }
  },
});

export const deleteApiKey = action({
  args: {
    provider: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; message: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { provider } = args;

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

    const result = await ctx.runMutation(internal.keysMutations.deleteApiKey, {
      keyId: encryptedApiKey._id,
    });

    if (result.success == false) {
      return {
        success: false,
        message: `Failed to delete ${provider} key`,
      };
    }
    return {
      success: true,
      message: `Deleted ${provider} key`,
    };
  },
});
