import { ObjectId } from "mongodb";
import { ApiError } from "../../utils/ApiError.js";
import { env } from "../../config/env.js";
import { decrypt } from "../../utils/crypto.js";
import { GoogleAccountRepository } from "./google-account.repository.js";
import { GoogleTokenResponse, StoredGoogleTokens } from "../auth/auth.types.js";

export const GoogleOAuthService = {
    async getValidAccessToken(userId: ObjectId): Promise<string> {
        const userAccount = await GoogleAccountRepository.findByUserId(userId);

        if (!userAccount) {
            throw new ApiError(404, "Google account not connected");
        };

        const decryptedTokens = JSON.parse(decrypt(userAccount.encryptedTokens)) as StoredGoogleTokens;

        if (typeof decryptedTokens.accessToken !== "string") {
            throw new ApiError(401, "Missing access token");
        };

        const thresholdMs = env.google.tokenRefreshThresholdSeconds * 1000;

        if (userAccount.expiresAt && userAccount.expiresAt.getTime() > Date.now() + thresholdMs) {
            return decryptedTokens.accessToken;
        };

        if (typeof decryptedTokens.refreshToken !== "string") {
            throw new ApiError(401, "Google authorization required");
        };

        const tokens = await refreshAccessToken(decryptedTokens.refreshToken);

        await GoogleAccountRepository.updateTokens(
            userId,
            {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenType: tokens.token_type,
                expiresIn: tokens.expires_in,
            },
        );
        return tokens.access_token;
    },
};

const refreshAccessToken = async (refreshToken: string): Promise<GoogleTokenResponse> => {
    const response = await fetch(env.google.tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: env.google.clientId,
            client_secret: env.google.clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    });

    if (response.status === 400 || response.status === 401) {
        throw new ApiError(401, "Google authorization required");
    };

    if (!response.ok) {
        throw new ApiError(502, "Google upstream error");
    };

    const data: unknown = await response.json();

    if (
        !data ||
        typeof data !== "object" ||
        typeof (data as GoogleTokenResponse).access_token !==
        "string"
    ) {
        throw new ApiError(502, "Malformed response from Google");
    };

    return data as GoogleTokenResponse;
};