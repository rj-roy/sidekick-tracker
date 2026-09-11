import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiRsponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { AuthService } from "./auth.service.js";
import { serializeState, parseState, validateLoginCallback } from "./auth.validation.js";
import { env } from "../../config/env.js";
import { GoogleAccountRepository } from "../google-accounts/index.js";
// import { SessionService } from "../session/session.service.js";

export const AuthController = {
    googleAuthRedirect(req: Request, res: Response) {
        const rawDeviceId = req.query.device_id;
        // console.log(req.get('user-agent'), "usisisis");
        const deviceId =
            typeof rawDeviceId === "string" && rawDeviceId.trim()
                ? rawDeviceId.trim()
                : crypto.randomUUID();
        
        const state = serializeState(deviceId);
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
        const savedStateRaw = req.cookies?.[env.cookies.oauthState];
        const savedState = typeof savedStateRaw === "string" ? parseState(savedStateRaw) : null;

        if (!savedState || savedState.random !== state.random) {
            throw new ApiError(400, "invalid or expired OAuth state");
        }

        const deviceId = state.deviceId;

        if (!deviceId) {
            throw new ApiError(400, "invalid or expired OAuth state");
        }

        const { user, tokens } = await AuthService.getCallbackCred(code);
        // todo: if user not with google signup then revoke creating an account just put the user details

        if (tokens?.access_token) {
            await GoogleAccountRepository.upsertTokens(user._id, user.email, {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenType: tokens.token_type,
                expiresIn: tokens.expires_in,
                scope: tokens.scope,
            });
        }

        const device = AuthService.deriveDeviceFromRequest(req, deviceId);
        // const { token, rotationKey, session } = await SessionService.createSession(user._id, device, req);
        // SessionService.setSessionCookie(res, token, rotationKey);
        // res.clearCookie(env.cookies.oauthState);

        return ApiResponse.success(res, "Login successful", {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                picture: user.picture,
            },
            // session,
        });
    },
};