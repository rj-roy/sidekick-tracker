import type { NextFunction, Request, Response } from "express";
import type { ObjectId } from "mongodb";
import { ApiError } from "../utils/ApiError.js";
import { SessionService } from "../modules/session/session.service.js";
import { env } from "../config/env.js";
import { cookieOptions } from "../utils/cookies.js";
import { csrfTokenFor } from "./csrf.middleware.js";
import { logSecurityEvent } from "../utils/security-log.js";

declare global {
    namespace Express {
        interface Request {
            userId?: ObjectId;
            sessionId?: string;
            sessionToken?: string;
        }
    }
}

const extractToken = (
    req: Request
): { token: string | undefined; viaBearer: boolean } => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        if (!authHeader.startsWith("Bearer ")) {
            throw new ApiError(401, "Authentication required", "SESSION_INVALID");
        }

        return { token: authHeader.slice(7), viaBearer: true };
    }

    return { token: req.cookies?.[env.cookies.raw], viaBearer: false };
};

const ensureBearerOrigin = (req: Request): void => {
    const origin = req.get("origin");

    if (!origin || !env.appExtensions.includes(origin)) {
        logSecurityEvent("SESSION_BEARER_UNTRUSTED_ORIGIN", { path: req.path });
        throw new ApiError(
            403,
            "Bearer tokens are only accepted from the extension",
            "SESSION_DENIED_ORIGIN"
        );
    }
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const { token, viaBearer } = extractToken(req);

    if (!token) {
        throw new ApiError(401, "Authentication required");
    }

    if (viaBearer) {
        ensureBearerOrigin(req);
    }

    const userAgent = req.get("user-agent") || "unknown";
    const ipAddress = req.ip || "unknown";

    const result = await SessionService.validateSession(token, { userAgent, ipAddress });
    req.userId = result.session.userId;
    req.sessionId = result.session._id.toHexString();
    req.sessionToken = token;

    if (result.rotatedToken && result.rotatedSessionId) {
        req.sessionId = result.rotatedSessionId;
        req.sessionToken = result.rotatedToken;

        if (viaBearer) {
            res.setHeader("x-session-token", result.rotatedToken);
        } else {
            res.cookie(env.cookies.raw, result.rotatedToken, cookieOptions(env.session.expiresInSeconds * 1000));
        }

        res.setHeader("x-csrf-token", csrfTokenFor(result.rotatedSessionId));
    }

    next();
};