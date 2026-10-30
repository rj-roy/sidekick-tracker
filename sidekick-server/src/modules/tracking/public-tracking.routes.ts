import { Router, type Request } from "express";
import { ipKeyGenerator } from "express-rate-limit";
import { asyncHandler } from "../../utils/http/async-handler.js";
import { createRateLimit } from "../../middleware/rate-limit.middleware.js";
import { TrackingController } from "./tracking.controller.js";

const router = Router();

const pixelKey = (req: Request): string => {
    const token = req.path.split("/").pop() ?? "none";
    const ip = ipKeyGenerator(req.get("x-client-ip") ?? req.ip ?? "");
    return `${ip}:${token}`;
};

router.get(
    "/open/:token",
    createRateLimit({ windowMs: 60_000, limit: 120, keyGenerator: pixelKey }),
    asyncHandler(TrackingController.open)
);

export default router;
