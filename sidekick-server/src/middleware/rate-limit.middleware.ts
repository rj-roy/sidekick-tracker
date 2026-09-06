import type { Request, RequestHandler, Response, NextFunction } from "express";
import { ApiResponse } from "../utils/ApiRsponse.js";
import type { RateLimitStore } from "../config/rate-limit.js";

type KeyFn = (req: Request) => string;

export const createRateLimit = ({ store, windowMs, max, keyFn }: {
    store: RateLimitStore;
    windowMs: number;
    max: number;
    keyFn?: KeyFn;
}): RequestHandler => {
    const resolveKey = keyFn ?? ((req: Request) => req.ip ?? "unknown");

    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const count = await store.increment(resolveKey(req), windowMs);
            if (count > max) {
                return ApiResponse.error(res, "Too many requests", 429, "RATE_LIMIT");
            }
        } catch (err) {
            return next();
        }
        next();
    };
};