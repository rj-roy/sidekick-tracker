import { ApiError } from "../../utils/ApiError.js";
import { env } from "../../config/env.js";
import { AuthRepository } from "./auth.repository.js";
import { GoogleTokenResponse, GoogleUserInfo, StoredGoogleTokens } from "./auth.types.js";
import { GoogleAccountRepository } from "../google-accounts/google-account.repository.js";
import { ObjectId } from "mongodb";
import { decrypt } from "../../utils/crypto.js";

export const AuthService = {
    getGoogleAuthUrl(state: string) {
        const params = new URLSearchParams({
            client_id: env.google.clientId,
            redirect_uri: env.google.redirectUrl,
            response_type: "code",
            scope: env.google.scope,
            state,
            access_type: 'offline',
            prompt: 'consent'
        });
        return `${env.google.authUrl}?${params.toString()}`
    },

    async getCallbackCred(code: string) {
        const tokens = await exchangeCodeForTokens(code);
        const googleUser = await getUserInfo(tokens.access_token);

        if (!googleUser.verified_email) {
            throw new ApiError(403, "Google email is not verified");
        }

        const user = await AuthRepository.upsert({
            googleId: googleUser.id,
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture,
            emailVerified: !!googleUser.verified_email,
        });

        return { user, tokens };
    },

    async getValidAccessToken(userId: ObjectId): Promise<string> {
        const userAccount = await GoogleAccountRepository.findByUserId(userId);

        if (!userAccount) {
            throw new ApiError(404, "Google account not connected");
        };

        const decryptedTokens = JSON.parse(decrypt(userAccount.encryptedTokens)) as StoredGoogleTokens;

        if (typeof decryptedTokens.accessToken !== "string") {
            throw new ApiError(401, "Missing access token");
        };

        if(!userAccount.expiresAt){
            throw new ApiError(401, "undefined session validation");
        };

        if (userAccount.expiresAt.getTime() > Date.now() + 60_000) {
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

const getUserInfo = async (accessToken: string): Promise<GoogleUserInfo> => {
    const response = await fetch(env.google.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401 || response.status === 403) {
        throw new ApiError(401, "Google authorization failed");
    }

    if (!response.ok) {
        throw new ApiError(502, "Google upstream error");
    }

    const data: unknown = await response.json();

    if (!data || typeof data !== "object" || typeof (data as GoogleUserInfo).email !== "string") {
        throw new ApiError(502, "Malformed response from Google");
    }

    return data as GoogleUserInfo;
};


const exchangeCodeForTokens = async (code: string): Promise<GoogleTokenResponse> => {
    const response = await fetch(env.google.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: env.google.clientId,
            client_secret: env.google.clientSecret,
            redirect_uri: env.google.redirectUrl,
            grant_type: "authorization_code",
        }),
    });

    if (response.status === 401 || response.status === 403) {
        throw new ApiError(401, "Google authorization failed");
    };

    if (!response.ok) {
        throw new ApiError(502, "Google upstream error");
    };

    const tokens: unknown = await response.json();

    if (!tokens ||
        typeof tokens !== "object" ||
        typeof (tokens as GoogleTokenResponse).access_token !== "string"
    ) {
        throw new ApiError(502, "Malformed response from Google");
    }

    return tokens as GoogleTokenResponse;
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


