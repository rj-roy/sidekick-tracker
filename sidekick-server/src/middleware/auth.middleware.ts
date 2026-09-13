import type { NextFunction, Request, Response } from "express";
import type { ObjectId } from "mongodb";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { SessionService } from "../modules/session/session.service.js";

declare global {
    namespace Express {
        interface Request {
            userId?: ObjectId;
            sessionId?: string;
            sessionToken?: string;
        }
    }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : req.cookies?.[env.cookies.raw];

    if (!token) {
        throw new ApiError(401, "Authentication required");
    }

    const userAgent = req.get("user-agent") || "unknown";
    const ipAddress = req.ip || "unknown";

    const result = await SessionService.validateSession(token, { userAgent, ipAddress });
    req.userId = result.session.userId;
    req.sessionId = result.session._id.toHexString();
    req.sessionToken = token;

    if (result.rotatedToken) {
        req.sessionToken = result.rotatedToken;
        res.cookie(env.cookies.raw, result.rotatedToken, {
            httpOnly: true,
            secure: env.nodeEnv === "production",
            sameSite: "lax",
            maxAge: env.session.expiresInSeconds * 1000,
        });
    }

    next();
};