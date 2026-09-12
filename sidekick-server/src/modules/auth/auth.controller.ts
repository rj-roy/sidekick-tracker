import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiRsponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { AuthService } from "./auth.service.js";
import { validateLoginCallback } from "./auth.validation.js";
import { env } from "../../config/env.js";
import { GoogleAccountRepository } from "../google-accounts/index.js";

export const AuthController = {
    googleAuthRedirect(req: Request, res: Response) {
        const state = crypto.randomUUID();
        const url = AuthService.getGoogleAuthUrl(state);
        const isProd = env.nodeEnv === "production";

        res.cookie(env.cookies.oauthState, state, {
            httpOnly: true,
            secure: isProd,
            sameSite: "lax",
            maxAge: 10 * 60 * 1000,
        });
        res.redirect(url);
    },

    async handleGoogleCallback(req: Request, res: Response) {
        const { code, state } = validateLoginCallback(req.query);
        const savedState = req.cookies?.[env.cookies.oauthState];

        if (!savedState || !state || savedState !== state) {
            throw new ApiError(400, "invalid or expired OAuth state");
        };
        const { user, tokens } = await AuthService.getCallbackCred(code);

        if (tokens?.access_token) {
            await GoogleAccountRepository.upsertTokens(user._id, user.email, {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenType: tokens.token_type,
                expiresIn: tokens.expires_in,
                scope: tokens.scope,
            });
        }

        //call the session

        return ApiResponse.success(res, "Login Succeed", {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                picture: user.picture,
            },
        });
    },
};
