import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/http/ApiRsponse.js";
import { ApiError } from "../../utils/error/ApiError.js";
import { TrackingService } from "./tracking.service.js";
import { validateIp, validateUa } from "../../utils/user/verifyUserInfo.js";
import { parseUa } from "../../utils/user/userInfo.js";
import type { OpenContext } from "./tracking.types.js";

const PIXEL_GIF = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
);

const sendPixel = (res: Response): Response => {
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Content-Length", String(PIXEL_GIF.length));
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).end(PIXEL_GIF);
};

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const isValidTrackingToken = (value: unknown): value is string =>
    typeof value === "string" && TOKEN_RE.test(value);

const openContext = (req: Request): OpenContext => {
    const { userAgent } = validateUa(req.get("x-client-ua") || req.get("user-agent") || "");
    const { clientIp } = validateIp(
        req.get("x-client-ip") || req.get("x-forwarded-for") || req.ip || ""
    );
    const { os, browser, isMobile } = parseUa(userAgent === "unknown" ? "" : userAgent);
    return { userAgent, ip: clientIp, isMobile, os, browser };
};

export const TrackingController = {
    async markSent(req: Request, res: Response) {
        if (!req.userId) {
            throw new ApiError(401, "Authentication required", "SESSION_INVALID");
        }

        const body = (req.body ?? {}) as {
            trackingToken?: unknown;
            subject?: unknown;
            recipient?: string[];
            sentAt?: unknown;
            messageId?: unknown;
        };

        if (typeof body.trackingToken !== "string" || body.trackingToken.length === 0) {
            throw new ApiError(400, "Missing tracking trackingToken", "TRACKING_TOKEN_MISSING");
        }

        const updated = await TrackingService.markTrackedEmailSent(body.trackingToken, req.userId, {
            subject: typeof body.subject === "string" ? body.subject : undefined,
            recipient: body.recipient ?? [],
            sentAt: typeof body.sentAt === "number" ? new Date(body.sentAt) : undefined,
            messageId: typeof body.messageId === "string" ? body.messageId : undefined,
        });

        if (!updated) {
            throw new ApiError(404, "Unknown tracking token", "TRACKING_NOT_FOUND");
        }

        return ApiResponse.success(res, "Tracked email marked as sent", updated, 200);
    },

    async open(req: Request, res: Response) {
        const token = req.params.token;

        if (!isValidTrackingToken(token)) {
            return sendPixel(res);
        }

        try {
            const recorded = await TrackingService.recordOpen(token, openContext(req));
            if (!recorded) console.warn("[tracking] open for unknown token");
        } catch (err) {
            console.error("[tracking] failed to record open:", err);
        }

        return sendPixel(res);
    },
};
