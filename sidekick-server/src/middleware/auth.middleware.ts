import type { NextFunction, Request, Response } from "express";
import type { ObjectId } from "mongodb";
import { ApiError } from "../utils/ApiError.js";
import { SessionService } from "../modules/session/session.service.js";
import { env } from "../config/env.js";
import { cookieOptions } from "../utils/cookies.js";
import { csrfTokenFor } from "./csrf.middleware.js";

declare global {
    namespace Express {
        interface Request {
            userId?: ObjectId;
            sessionId?: string;
            sessionToken?: string;
        }
    }
}

const extractToken = (req: Request): string | undefined => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return req.cookies?.[env.cookies.raw];
    }

    if (!authHeader.startsWith("Bearer ")) {
        throw new ApiError(401, "Authentication required", "SESSION_INVALID");
    }

    return authHeader.slice(7);
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);

    if (!token) {
        throw new ApiError(401, "Authentication required");
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

        res.cookie(env.cookies.raw, result.rotatedToken, cookieOptions(env.session.expiresInSeconds * 1000));
        res.setHeader("x-csrf-token", csrfTokenFor(result.rotatedSessionId));
    }

    next();
};