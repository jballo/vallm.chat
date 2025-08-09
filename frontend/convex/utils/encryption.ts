"use node";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // For GCM, this is always 16 bytes
// const SALT_LENGTH = 32;
// const TAG_LENGTH = 16;
const KEY_LENGTH = 32;


export const generateEntropy = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

export const generateSalt = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const deriveUserKey = (
  entropy: string,
  createdAt: number,
  salt: string,
  kdf_name: "scrypt" | "argon2",
  params: { N: number, r: number, p: number } | { m: number, t: number, p: number }
): Buffer | undefined => {
  if (kdf_name === "scrypt") {
    const keyMaterial = `${entropy}|${createdAt}`;
    return crypto.scryptSync(keyMaterial, salt, KEY_LENGTH, params as { N: number, r: number, p: number });
  } else {
    return undefined;
  }
};

export const encryptApiKey = (
  plainApiKey: string, 
  entropy: string,
  createdAt: number,
  salt: string,
  version: string,
  kdf_name: "scrypt" | "argon2",
  params: { N: number, r: number, p: number } | { m: number, t: number, p: number }
): { success: true, encryptedKey: string } | { success: false, error: string } => {

  try {

    let derivedKey: Buffer | undefined;
    
    if (version === "v1") { 
      derivedKey = deriveUserKey(
          entropy,
          createdAt,
          salt,
          kdf_name,
          params,
      );
    } else {
      console.error(`Unsupported encryption version: ${version}`);
      return { success: false, error: `Unsupported encryption version: ${version}` };
    }

    if (derivedKey === undefined) {
      console.error(`Unsupported encryption method`);
      return { success: false, error: `Unsupported encryption method: ${kdf_name}` };
    }
  
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  
    let encrypted = cipher.update(plainApiKey, "utf-8", "hex");
    encrypted += cipher.final("hex");
  
    const authTag = cipher.getAuthTag();

    // Format: version:iv:authTag:encryptedData
    return { success: true, encryptedKey: `${version}|${iv.toString("hex")}|${authTag.toString("hex")}|${encrypted}` };

  } catch (error) {
    console.error(`[encryptApiKey]: ${error}`);
    return { success: false, error: `${error}` }
  }
};

export const decryptApiKey = (
  encryptedApiKey: string, 
  userEncryptionKeyEntropy: string,
  userEncryptionKeySalt: string,
  userEncryptionKeyCreatedAt: number,
  kdf_name: "scrypt" | "argon2",
  params: { N: number, r: number, p: number } | { m: number, t: number, p: number },
): { success: true, apiKey: string } | { success: false, error: string } => {

  const parts = encryptedApiKey.split("|", 4);
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted data format");
  }

  const [version, ivHex, authTagHex, encryptedHex] = parts;

  

  let derivedKey: Buffer | undefined;

  try {
    if (version === "v1") {
      derivedKey = deriveUserKey(
        userEncryptionKeyEntropy,
        userEncryptionKeyCreatedAt,
        userEncryptionKeySalt,
        kdf_name,
        params,
      )
    } else {
      return { success: false, error: "UNSUPPORTED_VERSION"};
    }

    if (derivedKey === undefined) {
      console.error(`Unsupported encryption method`);
      return { success: false, error: `Unsupported encryption method: ${kdf_name}` };
    }

  } catch (error) {
    console.error("Error: ", error);
    return { success: false, error: "KDF_DERIVATION_ERROR"}
  }

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decypted = decipher.update(encryptedHex, 'hex', 'utf-8');
    decypted += decipher.final('utf-8');
    return { success: true, apiKey: decypted };
  } catch (error) {
    console.error("Error: ", error);
    return { success: false, error: "DECRYPTION_FAILED"}
  }
};
