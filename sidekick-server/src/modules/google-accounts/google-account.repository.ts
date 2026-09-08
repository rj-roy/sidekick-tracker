import { ensureDB } from "../../database/index.js";
import type { ObjectId, Document } from "mongodb";
import { env } from "../../config/env.js";
import { encrypt, decrypt } from "../../utils/crypto.js";
import type { GoogleAccountTokens } from "./google-account.types.js";

const collection = async () => {
  const db = await ensureDB();
  return db.collection(env.mongodb.collections.googleAccounts);
};

const extractStoredRefreshToken = (encryptedTokens: string): string | undefined => {
  try {
    const parsed = JSON.parse(decrypt(encryptedTokens)) as { refreshToken?: string };
    return parsed.refreshToken;
  } catch {
    return undefined;
  }
};

export const GoogleAccountRepository = {
  async upsertTokens(userId: ObjectId, email: string, tokens: GoogleAccountTokens) {
    const now = new Date();
    const scopeStr = tokens.scope || env.google.scope;
    const scopes = scopeStr.split(" ").map((s) => s.trim()).filter(Boolean);

    const existing = await (await collection()).findOne({ userId });
    const refreshToken =
      tokens.refreshToken ??
      (existing?.encryptedTokens
        ? extractStoredRefreshToken(existing.encryptedTokens)
        : undefined);

    const encryptedTokens = encrypt(
      JSON.stringify({
        accessToken: tokens.accessToken,
        refreshToken,
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
      })
    );

    const set: Document = {
      email,
      encryptedTokens,
      scopes,
      updatedAt: now,
    };
    if (typeof tokens.expiresIn === "number") {
      set.expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    }

    return (await collection()).findOneAndUpdate(
      { userId },
      {
        $set: set,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" }
    );
  },

  async findByUserId(userId: ObjectId) {
    return (await collection()).findOne({ userId });
  },

  async findByEmail(email: string) {
    return (await collection()).findOne({ email });
  },
};