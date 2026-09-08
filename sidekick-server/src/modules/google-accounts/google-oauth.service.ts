import type { ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { decrypt } from "../../utils/crypto.js";
import { GoogleAccountRepository } from "./google-account.repository.js";
import type { StoredGoogleTokens } from "./google-account.types.js";
import type { GoogleTokenResponse } from "../auth/auth.types.js";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

const parseStoredTokens = (encryptedTokens: string): StoredGoogleTokens => {
  try {
    const parsed = JSON.parse(decrypt(encryptedTokens)) as StoredGoogleTokens;
    if (typeof parsed.accessToken !== "string") {
      throw new Error("Missing access token");
    }
    return parsed;
  } catch {
    throw new ApiError(500, "Failed to decrypt stored Google tokens");
  }
};

const refreshAccessToken = async (refreshToken: string): Promise<GoogleTokenResponse> => {
  const response = await fetch(env.google.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new ApiError(401, "Google refresh token is invalid or revoked");
  }

  if (!response.ok) {
    throw new ApiError(502, "Google upstream error");
  }

  const data: unknown = await response.json();

  if (!data || typeof data !== "object" || typeof (data as GoogleTokenResponse).access_token !== "string") {
    throw new ApiError(502, "Malformed response from Google");
  }

  return data as GoogleTokenResponse;
};

export const GoogleOAuthService = {
  async getAccessToken(userId: ObjectId): Promise<string> {
    const account = await GoogleAccountRepository.findByUserId(userId);

    if (!account) {
      throw new ApiError(401, "No linked Google account for this user");
    }

    const tokens = parseStoredTokens(account.encryptedTokens);
    const expiresAtMs = account.expiresAt ? new Date(account.expiresAt).getTime() : 0;
    const needsRefresh = !account.expiresAt || expiresAtMs - Date.now() <= REFRESH_BUFFER_MS;

    if (!needsRefresh) {
      return tokens.accessToken;
    }

    if (!tokens.refreshToken) {
      throw new ApiError(401, "Google refresh token missing; re-authentication required");
    }

    const refreshed = await refreshAccessToken(tokens.refreshToken);

    await GoogleAccountRepository.upsertTokens(userId, account.email, {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? tokens.refreshToken,
      tokenType: refreshed.token_type,
      expiresIn: refreshed.expires_in,
      scope: refreshed.scope,
    });

    return refreshed.access_token;
  },
};