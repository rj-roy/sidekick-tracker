import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/http/ApiRsponse.js";
import { ApiError } from "../../utils/error/ApiError.js";
import { TrackingService } from "./tracking.service.js";

// 1x1 fully transparent GIF
// const PIXEL_GIF = Buffer.from(
//     "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
//     "base64"
// );

// const sendPixel = (res: Response): Response => {
//     res.setHeader("Content-Type", "image/gif");
//     res.setHeader("Content-Length", String(PIXEL_GIF.length));
//     res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
//     res.setHeader("Pragma", "no-cache");
//     res.setHeader("Expires", "0");
//     res.setHeader("X-Content-Type-Options", "nosniff");
//     return res.status(200).end(PIXEL_GIF);
// };

// const openContext = (req: Request) => {
//     let userAgent: string | undefined;
//     let ip: string | undefined;

//     try {
//         userAgent = validateUa(req.get("x-client-ua") || req.get("user-agent")).userAgent;
//     } catch {
//         userAgent = undefined;
//     };

//     try {
//         ip = validateIp(req.get("x-client-ip") || req.get("x-forwarded-for") || req.ip).clientIp;
//     } catch {
//         ip = undefined;
//     };

//     return { userAgent, ip };
// };

export const TrackingController = {
    async create(req: Request, res: Response) {
        console.log(req);
        if (!req.userId) {
            throw new ApiError(401, "Authentication required", "SESSION_INVALID");
        };

        const meta = (req.body ?? {}) as { subject?: unknown; recipientCount?: unknown };

        const created = await TrackingService.createTracking(req.userId, {
            subject: typeof meta.subject === "string" ? meta.subject : undefined,
            recipientCount: typeof meta.recipientCount === "number" ? meta.recipientCount : undefined,
        });

        return ApiResponse.success(res, "Tracking pixel created", created, 201);
    },

    // async open(req: Request, res: Response) {
    //     const token = req.params.token;

    //     // unknown/invalid tokens still return a pixel so the mail never renders a broken image
    //     if (!isValidTrackingToken(token)) {
    //         return sendPixel(res);
    //     };

    //     try {
    //         const recorded = await TrackingService.recordOpen(token, openContext(req));

    //         if (!recorded) {
    //             console.warn(`[tracking] open for unknown token`);
    //         };

    //     } catch (err) {
    //         console.error("[tracking] failed to record open:", err);
    //     };

    //     return sendPixel(res);
    // },
};
