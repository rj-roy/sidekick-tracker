import type { ObjectId, Document } from "mongodb";
import { env } from "../../config/env.js";
import { encrypt, decrypt } from "../../utils/security/crypto.js";
import type { GoogleAccountTokens } from "./google-account.types.js";
import { ensureDB } from "../../database/mongodb.js";
import { ApiError } from "../../utils/error/ApiError.js";
import { StoredGoogleTokens } from "../auth/auth.types.js";
import { normalizeEmail } from "../../utils/others/normalize-email.js";

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
    const col = await collection();
    const now = new Date();

    const scopes = (tokens.scope || env.google.scope).split(" ").map((s) => s.trim()).filter(Boolean);
    const existing = await col.findOne({ userId });
    let storedRefresh: string | undefined;

    try {
      storedRefresh = existing?.encryptedTokens
        ? extractStoredRefreshToken(existing.encryptedTokens) : undefined;
    } catch {
      storedRefresh = undefined;
    };

    const encryptedTokens = encrypt(
      JSON.stringify({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? storedRefresh,
        tokenType: tokens.tokenType,
      })
    );

    const update: Document = {
      $set: {
        userId,
        email: normalizeEmail(email),
        encryptedTokens,
        scopes: [...new Set([...(existing?.scopes ?? []), ...scopes])],
        updatedAt: now,
        ...(typeof tokens.expiresIn === "number"
          ? { expiresAt: new Date(now.getTime() + tokens.expiresIn * 1000) }
          : {}),
      },
      $setOnInsert: { createdAt: now },
    };

    if (typeof tokens.expiresIn !== "number") {
      update.$unset = { expiresAt: "" };
    }

    return col.findOneAndUpdate({ userId }, update, {
      upsert: true,
      returnDocument: "after",
    });
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
    );
  },

  async findByUserId(userId: ObjectId) {
    return await (await collection()).findOne({ userId });
  },

  // //legally-unused
  // async deleteByUserId(userId: ObjectId) {
  //   await (await collection()).deleteOne({ userId });
  // },
};