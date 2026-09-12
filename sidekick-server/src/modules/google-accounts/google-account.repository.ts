import type { ObjectId, Document } from "mongodb";
import { env } from "../../config/env.js";
import { encrypt, decrypt } from "../../utils/crypto.js";
import type { GoogleAccountTokens } from "./google-account.types.js";
import { ensureDB } from "../../database/mongodb.js";
import { ApiError } from "../../utils/ApiError.js";
import { StoredGoogleTokens } from "../auth/auth.types.js";

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

  async updateTokens(userId: ObjectId, tokens: GoogleAccountTokens) {
    const now = new Date();

    const existing = await (await collection()).findOne({ userId });

    if (!existing?.encryptedTokens) {
      throw new ApiError(404, "Google account not found");
    };

    const storedTokens = JSON.parse(decrypt(existing.encryptedTokens)) as StoredGoogleTokens;

    if (typeof storedTokens.refreshToken !== "string") {
      throw new ApiError(401, "Google authorization required");
    };

    const refreshToken = tokens.refreshToken ?? storedTokens.refreshToken;

    if (typeof tokens.expiresIn !== "number") {
      throw new ApiError(502, "Missing token expiration from Google");
    };

    const encryptedTokens = encrypt(
      JSON.stringify({
        accessToken: tokens.accessToken,
        refreshToken,
        tokenType: tokens.tokenType,
      })
    );

    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    return (await collection()).findOneAndUpdate(
      { userId },
      {
        $set: {
          encryptedTokens,
          expiresAt,
          updatedAt: now,
        },
      },
      {
        returnDocument: "after",
      }
    );
  },

  async findByUserId(userId: ObjectId) {
    return await (await collection()).findOne({ userId });
  },
};