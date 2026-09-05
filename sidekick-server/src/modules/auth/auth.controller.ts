import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiRsponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { AuthService } from "./auth.service.js";
import { validateLoginCallback } from "./auth.validation.js";

export const AuthController = {
    googleAuthRedirect(req: Request, res: Response) {
        const state = crypto.randomUUID();
        const url = AuthService.getGoogleAuthUrl(state);

        res.cookie('oauth_state', state, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: 10 * 60 * 1000,
        });
        res.redirect(url);
    },

    async handleGoogleCallback(req: Request, res: Response) {
        //http://localhost:5000/auth/google/callback?error=access_denied&state=758eb4ed-2cf5-4642-8a81-0db65c4db2b5
        //on signup clicking cancel handle the redirection

        const { code, state } = validateLoginCallback(req.query);
        const savedState = req.cookies?.oauth_state;

        if (!savedState || !state || savedState !== state) {
            throw new ApiError(400, "invalid or expired OAuth state");
        };
        const { user, tokens } = await AuthService.getCallbackCred(code);

        res.clearCookie('oauth_state');

        res.cookie('atc_tomn', tokens.access_token, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: tokens.expires_in * 1000,
        });

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
