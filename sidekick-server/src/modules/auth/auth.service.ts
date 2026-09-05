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

        const user = await AuthRepository.upsert({
            googleId: googleUser.id,
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture,
        });

        return { user, tokens };
    },
};

const getUserInfo = async (accessToken: string): Promise<GoogleUserInfo> => {
    const response = await fetch(env.google.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new ApiError(401, "Failed to fetch user information");
    };
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

    if (!response.ok) {
        throw new ApiError(401, "Failed to exchange authorization code");
    }

    return response.json() as Promise<GoogleTokenResponse>;
};


