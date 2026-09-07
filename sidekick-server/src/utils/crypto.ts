import crypto from "crypto";
import { env } from "../config/env.js";
import { ApiError } from "./ApiError.js";

const ALGORITHM = "aes-256-gcm";

const KEY = Buffer.from(env.session.tokenEncryptionKey, "base64");
if (KEY.length !== 32) {
  throw new ApiError(500, "TOKEN_ENCRYPTION_KEY must be a 32-byte base64 value");
}

export function encrypt(value: string): string {
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
  } catch (err) {
    throw new ApiError(500, "Failed to encrypt value");
  }
}

export function decrypt(value: string): string {
  try {
    const [ivB64, tagB64, dataB64] = value.split(":");
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new Error("Malformed ciphertext");
    }
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch (err) {
    throw new ApiError(400, "Failed to decrypt value");
  }
}