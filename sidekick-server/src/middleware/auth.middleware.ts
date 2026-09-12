import type { NextFunction, Request, Response } from "express";
import type { ObjectId } from "mongodb";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { SessionService } from "../modules/session/session.service.js";

declare global {
    namespace Express {
        interface Request {
            userId?: ObjectId;
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

    const result = await SessionService.validateSession(token);
    req.userId = result.session.userId;
    req.sessionToken = token;

    next();
};