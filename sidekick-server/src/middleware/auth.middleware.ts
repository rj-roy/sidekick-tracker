import type { NextFunction, Request, Response } from "express";
import type { ObjectId } from "mongodb";
import { ApiError } from "../utils/ApiError.js";
import { SessionService } from "../modules/session/session.service.js";
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

//reviewd
const extractToken = (req: Request): { token: string } => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        throw new ApiError(401, "Authentication required", "SESSION_INVALID");
    };

    const token = authHeader.slice(7);

    if (!token) {
        throw new ApiError(401, "Authentication required", "SESSION_INVALID");
    };

    return { token };
};

//reviewed, todo: untrackted
export const authenticator = async (req: Request, res: Response, next: NextFunction) => {
    const { token } = extractToken(req);

    if (!token) {
        throw new ApiError(401, "Authentication required");
    };

    const userAgent = req.get("user-agent") || "unknown";
    const ipAddress = req.ip || "unknown";

    const result = await SessionService.validateSession(token, { userAgent, ipAddress });

    if (result.rotatedToken && result.rotatedSessionId) {
        logSecurityEvent("SESSION_BEARER_UNTRUSTED_ORIGIN", { path: req.path });
        res.setHeader("x-rCsrf-token", csrfTokenFor(result.rotatedSessionId));
        res.setHeader("x-rSession-token", result.rotatedToken);
    };

    req.userId = result.session.userId;
    req.sessionId = result.rotatedSessionId ?? result.session._id.toHexString();
    req.sessionToken = result.rotatedToken ?? token;

    next();
};