"use node";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // For GCM, use 12 bytes for reasonable efficiency
const KEY_LENGTH = 32;

// memory budget for a single KDF call (conservative)
const MAX_KDF_MEMORY_BYTES = 128 * 1024 * 1024; // 128 MB (safe default for a 512MB process)

// scrypt parameter bounds (practical / conservative)
const MIN_SCRYPT_N = 1 << 14;    // 16384 (common safe minimum; ~16 MB when r=8)
const MAX_SCRYPT_N = 1 << 17;    // 131072 (2^17) — upper bound given r=8, p=1 and 128MB budget

const MIN_SCRYPT_R = 8;          // common default; larger r increases memory linearly
const MAX_SCRYPT_R = 32;

const MIN_SCRYPT_P = 1;
const MAX_SCRYPT_P = 2;          // keep p small; parallelization multiplies memory use


export const generateEntropy = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

export const generateSalt = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const deriveUserKey = async (
  entropy: string,
  createdAt: number,
  salt: string,
  kdf_name: "scrypt" | "argon2",
  params: { N: number, r: number, p: number } | { m: number, t: number, p: number }
): Promise<Buffer | undefined> => {
  if (kdf_name === "scrypt") {
    
    const formattedParams = params as { N: number, r: number, p: number };
    
    if (typeof formattedParams.N !== "number" || formattedParams.N < MIN_SCRYPT_N || formattedParams.N > MAX_SCRYPT_N) {
      return undefined;
    }
    
    if( typeof formattedParams.r !== "number" || formattedParams.r < MIN_SCRYPT_R || formattedParams.r > MAX_SCRYPT_R) {
      return undefined;
    }
    
    if (typeof formattedParams.p !== "number" || formattedParams.p < MIN_SCRYPT_P || formattedParams.p > MAX_SCRYPT_P) {
      return undefined;
    }
    
    const approxMem = 128 * formattedParams.N * formattedParams.r * formattedParams.p;
    
    if (approxMem > MAX_KDF_MEMORY_BYTES) {
      return undefined;
    }

    const keyMaterial = `${entropy}|${createdAt}`;
    
    const scryptOptions = {
      N: formattedParams.N,
      r: formattedParams.r,
      p: formattedParams.p,
      // ensure we have a safe maxem
      maxmem: Math.min(approxMem * 2, MAX_KDF_MEMORY_BYTES),
    }

    const derived =  await new Promise<Buffer | undefined>((resolve) => {
      crypto.scrypt(keyMaterial, salt, KEY_LENGTH, scryptOptions, (err: Error | null, derivedKey: Buffer) => {
        if (err) {
          resolve(undefined);
          return;
        }
        resolve(derivedKey);
        return;
      });
    });

    return derived;
  } else {
    return undefined;
  }
};

export const encryptApiKey = async (
  plainApiKey: string, 
  entropy: string,
  createdAt: number,
  salt: string,
  version: string,
  kdf_name: "scrypt" | "argon2",
  params: { N: number, r: number, p: number } | { m: number, t: number, p: number },
): Promise<{ success: true, encryptedKey: string } | { success: false, error: string }> => {

  try {

    let derivedKey: Buffer | undefined;
    
    if (version === "v1") { 
      derivedKey = await deriveUserKey(
          entropy,
          createdAt,
          salt,
          kdf_name,
          params,
      );
    } else {
      console.error("[encryptApiKey]: ENCRYPTION_FAILURE")
      return { success: false, error: `ENCRYPTION_FAILURE` };
    }

    if (derivedKey === undefined) {
      console.error("[encryptApiKey]: ENCRYPTION_FAILURE")
      return { success: false, error: `ENCRYPTION_FAILURE` };
    }
  
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  
    let encrypted = cipher.update(plainApiKey, "utf-8", "hex");
    encrypted += cipher.final("hex");
  
    const authTag = cipher.getAuthTag();

    // Format: version:iv:authTag:encryptedData
    return { success: true, encryptedKey: `${version}|${iv.toString("hex")}|${authTag.toString("hex")}|${encrypted}` };

  } catch (error) {
    void error;

    console.error("[encryptApiKey]: ENCRYPTION_FAILURE")
    return { success: false, error: `ENCRYPTION_FAILURE` };
  }
};

export const decryptApiKey = async (
  encryptedApiKey: string, 
  userEncryptionKeyEntropy: string,
  userEncryptionKeySalt: string,
  userEncryptionKeyCreatedAt: number,
  kdf_name: "scrypt" | "argon2",
  params: { N: number, r: number, p: number } | { m: number, t: number, p: number },
): Promise<{ success: true, apiKey: string } | { success: false, error: string }> => {

  const parts = encryptedApiKey.split("|", 4);
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted data format");
  }

  const [version, ivHex, authTagHex, encryptedHex] = parts;

  

  let derivedKey: Buffer | undefined;

  try {
    if (version === "v1") {
      derivedKey = await deriveUserKey(
        userEncryptionKeyEntropy,
        userEncryptionKeyCreatedAt,
        userEncryptionKeySalt,
        kdf_name,
        params,
      )
    } else {
      console.error("[decryptApiKey]: DECRYPTION_ERROR");
      return { success: false, error: "DECRYPTION_ERROR"};
    }

    if (derivedKey === undefined) {
      console.error("[decryptApiKey]: DECRYPTION_ERROR");
      return { success: false, error: "DECRYPTION_ERROR"};
    }

  } catch (error) {
    void error;
    console.error("[decryptApiKey]: DECRYPTION_ERROR");
    return { success: false, error: "DECRYPTION_ERROR"};
  }

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decypted = decipher.update(encryptedHex, 'hex', 'utf-8');
    decypted += decipher.final('utf-8');
    return { success: true, apiKey: decypted };
  } catch (error) {
    void error;
    console.error("[decryptApiKey]: DECRYPTION_ERROR");
    return { success: false, error: "DECRYPTION_ERROR"};
  }
};
