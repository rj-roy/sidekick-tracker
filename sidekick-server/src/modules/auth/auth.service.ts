import { ApiError } from "../../utils/ApiError.js";
import { env } from "../../config/env.js";
import { AuthRepository } from "./auth.repository.js";
import { GoogleTokenResponse, GoogleUserInfo } from "./auth.types.js";

export const AuthService = {
    getGoogleAuthUrl(state: string) {
        const params = new URLSearchParams({
            client_id: env.google.clientId,
            redirect_uri: env.google.redirectUrl,
            response_type: "code",
            scope: "openid email profile",
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

    return response.json() as Promise<GoogleUserInfo>;
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
    }

    if (!response.ok) {
        throw new ApiError(502, "Google upstream error");
    }

    return response.json() as Promise<GoogleTokenResponse>;
};


