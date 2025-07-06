"use node";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // For GCM, this is always 16 bytes
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
  salt: string
): Buffer => {
  const keyMaterial = `${entropy}:${createdAt}`;
  return crypto.scryptSync(keyMaterial, salt, KEY_LENGTH);
};

export const encryptApiKey = (apiKey: string, derivedKey: Buffer): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

  let encrypted = cipher.update(apiKey, "utf-8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
};

export const decryptApiKey = (
  encryptedApiKey: string,
  derivedKey: Buffer
): string => {
  const parts = encryptedApiKey.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted data format");

  const [ivHex, authTagHex, encryptedHex] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);

  let decypted = decipher.update(encryptedHex, "hex", "utf-8");
  decypted += decipher.final("utf-8");

  return decypted;
};
