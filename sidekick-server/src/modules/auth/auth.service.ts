import { ApiError } from "../../utils/ApiError.js";
import { env } from "../../config/env.js";
import { AuthRepository } from "./auth.repository.js";

interface GoogleTokenResponse {
    access_token: string;
    id_token: string;
    token_type: string;
    expires_in: number;
}

interface GoogleUserInfo {
    id: string;
    email: string;
    name: string;
    picture?: string;
}

export const AuthService = {

    generateGoogleAuthUrl(state: string) {
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

    async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
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
    },


    async processGoogleCallback(code: string) {
        const tokens = await this.exchangeCodeForTokens(code);
        const googleUser = await this.getUserInfo(tokens.access_token);

        const user = await AuthRepository.upsert({
            googleId: googleUser.id,
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture,
        });

        return { user, tokens };
    },

    async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
        const response = await fetch(env.google.userInfoUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new ApiError(401, "Failed to fetch user information");
        };
        return response.json() as Promise<GoogleUserInfo>;
    },

    // async getCurrentUser(userId: string) {
    //     const { ObjectId } = await import("mongodb");
    //     const user = await AuthRepository.findByGoogleId(userId);

    //     if (!user) {
    //         throw new ApiError(401, "User not found");
    //     }

    //     return user;
    // },
};
