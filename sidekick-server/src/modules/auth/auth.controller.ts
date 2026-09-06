import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiRsponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { AuthService } from "./auth.service.js";
import { validateLoginCallback } from "./auth.validation.js";
import { env } from "../../config/env.js";

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

        // res.clearCookie('oauth_state');

        // res.cookie('atc_tomn', tokens.access_token, {
        //     httpOnly: true,
        //     secure: true,
        //     sameSite: "lax",
        //     maxAge: tokens.expires_in * 1000,
        // });

        return ApiResponse.success(res, "Login successful", {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                picture: user.picture,
            },
        });
    },
};
