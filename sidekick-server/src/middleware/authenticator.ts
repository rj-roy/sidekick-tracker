import type { NextFunction, Request, Response } from "express";
import type { ObjectId } from "mongodb";
import { ApiError } from "../utils/error/ApiError.js";
import { SessionService } from "../modules/session/session.service.js";
import { csrfTokenFor } from "./csrf.middleware.js";
import { validateIp, validateUa } from "../utils/user/verifyUserInfo.js";
import { GoogleOAuthService } from "../modules/google-accounts/google-oauth.service.js";

declare global {
    namespace Express {
        interface Request {
            userId?: ObjectId;
            sessionId?: string;
            sessionToken?: string;
        }
    }
}

export const authenticator = async (req: Request, res: Response, next: NextFunction) => {
    const sessionToken = req.get('x-session-token');
    const csrfToken = req.get('x-csrf-token');

    if (!sessionToken || !csrfToken) {
        throw new ApiError(401, "Authentication required", "SESSION_INVALID");
    };

    const { userAgent } = validateUa(req.get("x-client-ua") || req.get("user-agent"));
    const { clientIp } = validateIp(req.get("x-client-ip") || req.get("x-forwarded-for") || req.ip);

    const result = await SessionService.validateSession(sessionToken, { userAgent, clientIp });

    if (result.rotatedToken && result.rotatedSessionId) {
        res.setHeader("x-r-csrf-token", csrfTokenFor(result.rotatedSessionId));
        res.setHeader("x-r-session-token", result.rotatedToken);
    };

    req.userId = result.session.userId;
    req.sessionId = result.rotatedSessionId ?? result.session._id.toHexString();
    req.sessionToken = result.rotatedToken ?? sessionToken;

    await GoogleOAuthService.validateGoogleAC(req);

    next();
};