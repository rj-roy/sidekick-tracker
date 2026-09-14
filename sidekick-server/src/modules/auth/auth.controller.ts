import type { Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import { ObjectId } from "mongodb";
import { ApiResponse } from "../../utils/ApiRsponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { AuthService } from "./auth.service.js";
import { validateLoginCallback } from "./auth.validation.js";
import { env } from "../../config/env.js";
import { GoogleAccountRepository } from "../google-accounts/index.js";
import { SessionService } from "../session/session.service.js";
import { AuthRepository } from "./auth.repository.js";
import { csrfTokenFor } from "../../middleware/csrf.middleware.js";
import { cookieOptions, clearCookieOptions } from "../../utils/cookies.js";
import { generatePkcePair, generateNonce } from "../../utils/pkce.js";
import { logSecurityEvent } from "../../utils/security-log.js";
import { AuthFailureGuard } from "../../utils/auth-failure-guard.js";

export const AuthController = {
    googleAuthRedirect(req: Request, res: Response) {
        const state = crypto.randomUUID();
        const { codeVerifier, codeChallenge } = generatePkcePair();
        const nonce = generateNonce();
        const url = AuthService.getGoogleAuthUrl({ state, codeChallenge, nonce });

        const cookieMaxAge = 10 * 60 * 1000;

        res.cookie(env.cookies.oauthState, state, {
            httpOnly: true,
            secure: env.cookies.secure,
            sameSite: "lax",
            path: "/",
            maxAge: cookieMaxAge,
        });

        res.cookie(env.cookies.oauthVerifier, JSON.stringify({ v: codeVerifier, n: nonce }), {
            httpOnly: true,
            secure: env.cookies.secure,
            sameSite: "lax",
            path: "/",
            maxAge: cookieMaxAge,
        });

        res.redirect(url);
    },

    async handleGoogleCallback(req: Request, res: Response) {
        const clearOAuthCookies = (): void => {
            res.clearCookie(env.cookies.oauthState, clearCookieOptions());
            res.clearCookie(env.cookies.oauthVerifier, clearCookieOptions());
        };

        const clientIp = req.ip || "unknown";

        if (AuthFailureGuard.isLockedOut(clientIp)) {
            throw new ApiError(
                429,
                "Too many failed sign-in attempts",
                "AUTH_LOCKED_OUT"
            );
        }

        try {
            const { code, state } = validateLoginCallback(req.query);
            const savedState = req.cookies?.[env.cookies.oauthState];

            const stateMatches =
                typeof savedState === "string" &&
                state.length === savedState.length &&
                timingSafeEqual(Buffer.from(savedState), Buffer.from(state));

            if (!stateMatches) {
                logSecurityEvent("OAUTH_STATE_MISMATCH");
                throw new ApiError(400, "OAuth authentication failed", "OAUTH_ERROR");
            }

            let verifier = "";
            let nonce = "";

            try {
                const pkceRaw = req.cookies?.[env.cookies.oauthVerifier];
                if (typeof pkceRaw === "string" && pkceRaw) {
                    const parsed = JSON.parse(pkceRaw) as { v?: string; n?: string };
                    verifier = typeof parsed.v === "string" ? parsed.v : "";
                    nonce = typeof parsed.n === "string" ? parsed.n : "";
                }
            } catch {
                // malformed verifier cookie — proceed; token verification still runs
            }

            if (!verifier || !nonce) {
                logSecurityEvent("OAUTH_LOGIN_FAILURE", {
                    reason: nonce ? "missing-verifier" : "missing-nonce",
                });
                throw new ApiError(400, "OAuth authentication failed", "OAUTH_ERROR");
            }

            const callbackCred = async (): Promise<Awaited<ReturnType<typeof AuthService.getCallbackCred>>> => {
                try {
                    return await AuthService.getCallbackCred(code, verifier, nonce);
                } catch (err: unknown) {
                    logSecurityEvent("OAUTH_LOGIN_FAILURE", { message: err instanceof Error ? err.message : "unknown" });
                    throw err;
                }
            };

            const { user, tokens } = await callbackCred();

            if (tokens?.access_token) {
                const normalizedEmail = user.email.toLowerCase().trim();

                await GoogleAccountRepository.upsertTokens(user._id, normalizedEmail, {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    tokenType: tokens.token_type,
                    expiresIn: tokens.expires_in,
                    scope: tokens.scope,
                });

                logSecurityEvent("GOOGLE_ACCOUNT_CONNECTED", {
                    userId: user._id.toHexString(),
                });
            }

            const data: {
                user: { id: string; email: string; name: string; picture?: string };
                csrfToken?: string;
            } = {
                user: {
                    id: user._id.toHexString(),
                    email: user.email,
                    name: user.name,
                    picture: user.picture,
                },
            };

            if (tokens) {
                const userAgent = req.get('user-agent') || "unknown";
                const ip = req.ip || "unknown";

                const { token, sessionId } = await SessionService.createSession(user._id, userAgent, ip);

                if (token && sessionId) {
                    logSecurityEvent("OAUTH_LOGIN_SUCCESS", { userId: user._id.toHexString(), sessionId });

                    res.cookie(env.cookies.raw, token, cookieOptions(env.session.expiresInSeconds * 1000));

                    data.csrfToken = csrfTokenFor(sessionId);
                };
            };

            clearOAuthCookies();
            return ApiResponse.success(res, "Login Succeed", data);
        } catch (err) {
            clearOAuthCookies();

            if (err instanceof ApiError && err.code) {
                AuthFailureGuard.recordFailure(clientIp, err.code);
            }

            throw err;
        }
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
            csrfToken: req.sessionId ? csrfTokenFor(req.sessionId) : undefined,
        });
    },

    async getCsrfToken(req: Request, res: Response) {
        if (!req.sessionId) {
            throw new ApiError(401, "Authentication required");
        }

        return ApiResponse.success(res, "Success", {
            csrfToken: csrfTokenFor(req.sessionId),
        });
    },

    async listSessions(req: Request, res: Response) {
        if (!req.userId) {
            throw new ApiError(401, "Authentication required");
        }

        const sessions = await SessionService.listSessions(req.userId);

        const activeSessions = sessions.filter((s) => !s.rotatedToHash);

        const data = activeSessions.map((s) => ({
            id: s._id.toHexString(),
            userAgent: s.userAgent,
            ipAddress: s.ipAddress,
            createdAt: s.createdAt.toISOString(),
            lastSeenAt: s.lastSeenAt.toISOString(),
            expiresAt: s.expiresAt.toISOString(),
            isCurrent: req.sessionId === s._id.toHexString(),
            isExpired: s.expiresAt.getTime() <= Date.now(),
            isRevoked: !!s.revokedAt,
        }));

        return ApiResponse.success(res, "Success", { sessions: data });
    },

    async revokeSession(req: Request, res: Response) {
        if (!req.userId) {
            throw new ApiError(401, "Authentication required");
        }

        const sessionId = req.params.sessionId;

        if (typeof sessionId !== "string" || !ObjectId.isValid(sessionId)) {
            throw new ApiError(400, "Invalid session id");
        }

        if (sessionId === req.sessionId) {
            throw new ApiError(400, "Cannot revoke the current session from this endpoint; use logout instead");
        }

        const revoked = await SessionService.revokeSessionById(
            req.userId,
            new ObjectId(sessionId),
            "revoked-by-user"
        );

        if (!revoked) {
            throw new ApiError(404, "Session not found");
        }

        return ApiResponse.success(res, "Session revoked");
    },

    async logoutAll(req: Request, res: Response) {
        if (!req.userId) {
            throw new ApiError(401, "Authentication required");
        }

        await SessionService.revokeAllForUser(req.userId, "logout-all");

        res.clearCookie(env.cookies.raw, clearCookieOptions());

        return ApiResponse.success(res, "All sessions revoked");
    },

    async logout(req: Request, res: Response) {
        if (req.sessionToken) {
            await SessionService.revokeSession(req.sessionToken, "logout");
        }

        res.clearCookie(env.cookies.raw, clearCookieOptions());

        return ApiResponse.success(res, "Logged out");
    },
};