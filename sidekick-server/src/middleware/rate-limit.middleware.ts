import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { ApiResponse } from "../utils/ApiRsponse.js";

type KeyFn = (req: Request) => string;

export const createRateLimit = ({ windowMs, limit, keyGenerator }: {
    windowMs: number;
    limit: number;
    keyGenerator?: KeyFn;
}) => {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator,
        handler: (_req, res) => {
            return ApiResponse.error(res, "Too many requests", 429, "RATE_LIMIT");
        },
    });
};