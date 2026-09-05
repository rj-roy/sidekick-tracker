// import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
// import { env } from "../config/env.js";
// import { ApiError } from "../utils/ApiError.js";

// const ALGO = "aes-256-gcm";
// const IV_LEN = 12;
// const TAG_LEN = 16;

// function getKey(): Buffer {
//   const key = Buffer.from(env.session.tokenEncryptionKey, "base64");
//   if (key.length !== 32) {
//     throw new ApiError(500, "Invalid token encryption key: must be 32 bytes (base64)");
//   }
//   return key;
// }

// export const validateEncryptionKey = (): void => { getKey(); };

// export function encryptToken(plain: string): string {
//   validateEncryptionKey();
//   const iv = randomBytes(IV_LEN);
//   const cipher = createCipheriv(ALGO, getKey(), iv);
//   const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
//   const authTag = cipher.getAuthTag();

//   return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
// }

// export function decryptToken(payload: string): string {
//   const parts = payload.split(".");
//   if (parts.length !== 3) {
//     throw new ApiError(500, "Malformed encrypted token");
//   }
//   const [ivB64, tagB64, dataB64] = parts;
//   const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
//   decipher.setAuthTag(Buffer.from(tagB64, "base64"));
//   try {
//     const plain = Buffer.concat([
//       decipher.update(Buffer.from(dataB64, "base64")),
//       decipher.final(),
//     ]);
//     return plain.toString("utf8");
//   } catch {
//     throw new ApiError(401, "Token integrity check failed (tampered or wrong key)");
//   }
// }

// export function validateEncryptedToken(payload: string, originalPlain: string): boolean {
//   return decryptToken(payload) === originalPlain;
// }