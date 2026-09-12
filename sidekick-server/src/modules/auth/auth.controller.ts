import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiRsponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { AuthService } from "./auth.service.js";
import { validateLoginCallback } from "./auth.validation.js";
import { env } from "../../config/env.js";
import { GoogleAccountRepository } from "../google-accounts/index.js";
import { SessionService } from "../session/session.service.js";
import { AuthRepository } from "./auth.repository.js";
import { randomBytes } from "crypto";
import { setCsrfCookie } from "../../middleware/csrf.middleware.js";

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

        if (user && tokens) {
            const userAgent = req.get('user-agent') || "unknown";
            const ip = req.ip || "unknown";

            const { token } = await SessionService.createSession(user._id, userAgent, ip);

            if (token) {
                res.cookie(env.cookies.raw, token, {
                    httpOnly: true,
                    secure: env.nodeEnv === 'production',
                    sameSite: 'lax',
                    maxAge: env.session.expiresInSeconds * 1000,
                });

                // set a double-submit CSRF token cookie for client-side requests
                const csrfToken = randomBytes(16).toString('hex');
                setCsrfCookie(res, csrfToken);

                res.clearCookie(env.cookies.oauthState, {
                    httpOnly: true,
                    secure: env.nodeEnv === "production",
                    sameSite: "lax",
                });
            };
        };

        return ApiResponse.success(res, "Login Succeed", {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                picture: user.picture,
            },
        });
    },

    async getMe(req: Request, res: Response) {
        if (!req.userId) {
            throw new ApiError(401, "Authentication required");
        }

        const user = await AuthRepository.findById(req.userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        return ApiResponse.success(res, "Success", {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                picture: user.picture,
            },
        });
    },

    async logout(req: Request, res: Response) {
        if (req.sessionToken) {
            await SessionService.revokeSession(req.sessionToken, "logout");
        }

        res.clearCookie(env.cookies.raw, {
            httpOnly: true,
            secure: env.nodeEnv === "production",
            sameSite: "lax",
        });

        return ApiResponse.success(res, "Logged out");
    },
};
