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
  ): Promise<{ success: true; message: string } | { success: false, error: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { success: false, error: "Not authenticated"}
    
    try {
      const { provider, apiKey } = args;

      const entropy = generateEntropy();
      const salt = generateSalt();
      const version = "v1";
      const kdf_name = "scrypt";
      const params = { N: 16384, r: 8, p: 1, };
      const derivedAt = Date.now();

      const encryptionKey = await ctx.runMutation(internal.keysMutations.ensureEncryptionKeys, {
        entropy,
        salt,
        version,
        kdf_name,
        params,
      });

      if (!encryptionKey) {
        console.error("[saveApiKey]: ENCRYPTION_FAILURE");
        return { success: false, error: "Unable to save API key. Please try again later." };
      }

      if (typeof encryptionKey._creationTime !== "number") {
        console.error("[saveApiKey]: ENCRYPTION_FAILURE");
        return { success: false, error: "Unable to save API key. Please try again later." };
      }

      const encryptedApiKey = await encryptApiKey(
        apiKey,
        encryptionKey.entropy,
        encryptionKey._creationTime,
        encryptionKey.salt,
        encryptionKey.version,
        encryptionKey.kdf_name,
        encryptionKey.params,
      );

      if (encryptedApiKey.success === false) {
        console.error("[saveApiKey]: ENCRYPTION_FAILURE");
        return { success: false, error: "Unable to save API key. Please try again later." };
      }
  
      const result = await ctx.runMutation(
        internal.keysMutations.ensureEncryptedApiKeys,
        {
          user_id: identity.subject,
          encryptedApiKey: encryptedApiKey.encryptedKey,
          provider: provider,
          derivedAt,
        }
      );

      if (result === null) {
        console.error("[saveApiKey]: ENCRYPTED_API_KEY_NO_SAVE");
        return { success: false, error: "Unable to save API key. Please try again later." };
      }
  
      return {
        success: true,
        message: `${provider} API key, successfully saved`,
      };
    } catch (error) {
      void error;
      console.error("[saveApiKey]: ENCRYPTED_API_KEY_NO_SAVE");
      return {
        success: false,
        error: "Unable to save API key. Please try again later.",
      }
    }

  },
});

export const simpleDecryptKey = action({
  args: {
    encryptedApiKey: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: true; apiKey?: string; } | { success: false; error: string; }> => {
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { success: false, error: "Not authenticated" }


    const { encryptedApiKey } = args;

    try {
      const encryptionKeys = await ctx.runQuery(
        internal.keysMutations.getEncryptionKeys,
        {
          user_id: identity.subject,
        }
      );
  
      if (!encryptionKeys) {
        console.error("[simpleDecryptKey]: DECRYPTION_ERROR");
        return { success: false, error: "Unable to decrypt api key at this time. Please try again later." };
      }
  
      const decryptedApiKey = await decryptApiKey(
        encryptedApiKey,
        encryptionKeys.entropy,
        encryptionKeys.salt,
        encryptionKeys._creationTime,
        encryptionKeys.kdf_name,
        encryptionKeys.params,
      );

      if (decryptedApiKey.success === false) {
        console.error("[simpleDecryptKey]: DECRYPTION_ERROR");
        return { success: false, error: "Unable to decrypt api key at this time. Please try again later." };
      }
  
      return { success: true, apiKey: decryptedApiKey.apiKey };

    } catch (error) {
      void error;
      console.error("[simpleDecryptKey]: DECRYPTION_ERROR");
      return { success: false, error: "Unable to decrypt api key at this time. Please try again later." };
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
  ): Promise<{ success: true; message: string; } | { success: false; error: string; }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { success: false, error: "Not authenticated" }

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
