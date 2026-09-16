import { ApiError } from "../../utils/ApiError.js";
import { env } from "../../config/env.js";
import { AuthRepository } from "./auth.repository.js";
import { GoogleTokenResponse, GoogleUserInfo } from "./auth.types.js";
import { verifyGoogleIdToken } from "../../utils/google-jwt.js";
import { normalizeEmail } from "../../utils/normalize-email.js";

// reviewed
const upsertOrThrow = async (userData: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
    emailVerified?: boolean;
}) => {
    const user = await AuthRepository.upsert(userData);

    if (!user) {
        throw new ApiError(500, "Failed to create or update user");
    }

    return user;
};

export const AuthService = {
    //reviewed
    getGoogleAuthUrl(options: { state: string; codeChallenge: string; nonce: string; }) {
        const params = new URLSearchParams({
            client_id: env.google.clientId,
            redirect_uri: env.google.redirectUrl,
            response_type: "code",
            scope: env.google.scope,
            state: options.state,
            code_challenge: options.codeChallenge,
            code_challenge_method: "S256",
            nonce: options.nonce,
            access_type: 'offline',
            prompt: 'consent'
        });
        return `${env.google.authUrl}?${params.toString()}`
    },

    //reviewed
    async getCallbackCred(code: string, codeVerifier: string, nonce: string) {
        const tokens = await exchangeCodeForTokens(code, codeVerifier);

        if (typeof tokens.id_token !== "string" || !tokens.id_token) {
            throw new ApiError(502, "Missing id_token from Google");
        }

        const claims = await verifyGoogleIdToken(tokens.id_token, nonce);

        const email = claims.email?.trim();
        const verified = claims.email_verified === true;

        if (!email || !verified) {
            const googleUser = await getUserInfo(tokens.access_token);

            if (!googleUser.verified_email) {
                throw new ApiError(403, "Google email is not verified");
            };

            const fallbackEmail = normalizeEmail(googleUser.email);
            const fallbackSub = googleUser.id;

            if (claims.sub !== fallbackSub) {
                throw new ApiError(400, "OAuth authentication failed", "OAUTH_ERROR");
            }

            const user = await upsertOrThrow({
                googleId: fallbackSub,
                email: fallbackEmail,
                name: googleUser.name,
                picture: googleUser.picture,
                emailVerified: true,
            });

            return { user, tokens };
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await upsertOrThrow({
            googleId: claims.sub,
            email: normalizedEmail,
            name: claims.name ?? "",
            picture: claims.picture,
            emailVerified: true,
        });

        return { user, tokens };
    },
};

//reviewed
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

//reviewed
const exchangeCodeForTokens = async (code: string, codeVerifier: string): Promise<GoogleTokenResponse> => {
    const response = await fetch(env.google.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            code_verifier: codeVerifier,
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