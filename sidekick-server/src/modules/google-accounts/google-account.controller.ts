import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiRsponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { GoogleAccountRepository } from "./google-account.repository.js";
import { GoogleOAuthService } from "./google-oauth.service.js";
import { logSecurityEvent } from "../../utils/security-log.js";

export const GoogleAccountController = {
    async getAccount(req: Request, res: Response) {
        if (!req.userId) {
            throw new ApiError(401, "Authentication required");
        }

        const account = await GoogleAccountRepository.findByUserId(req.userId);

        if (!account) {
            throw new ApiError(404, "Google account not connected");
        }

        return ApiResponse.success(res, "Success", {
            account: {
                email: account.email,
                scopes: account.scopes,
                expiresAt: account.expiresAt,
            },
        });
    },

    async refreshToken(req: Request, res: Response) {
        if (!req.userId) {
            throw new ApiError(401, "Authentication required");
        }

        await GoogleOAuthService.getValidAccessToken(req.userId);

        const account = await GoogleAccountRepository.findByUserId(req.userId);

        return ApiResponse.success(res, "Token refreshed", {
            account: account
                ? { email: account.email, expiresAt: account.expiresAt }
                : undefined,
        });
    },

    async disconnect(req: Request, res: Response) {
        if (!req.userId) {
            throw new ApiError(401, "Authentication required");
        }

        await GoogleOAuthService.revokeAccount(req.userId);

        logSecurityEvent("GOOGLE_ACCOUNT_DISCONNECTED", { userId: req.userId.toHexString() });

        return ApiResponse.success(res, "Google account disconnected");
    },
};