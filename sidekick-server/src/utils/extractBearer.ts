import { Request } from "express";
import { ApiError } from "./ApiError.js";

export const extractBearer = (req: Request): { token: string } => {
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