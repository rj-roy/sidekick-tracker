import { Router } from "express";
import { asyncHandler } from "../../utils/http/async-handler.js";
import { createRateLimit, publicIpKey } from "../../middleware/rate-limit.middleware.js";
import { TrackingController } from "./tracking.controller.js";

const router = Router();

router.get(
    "/open/:token",
    createRateLimit({ windowMs: 60_000, limit: 120, keyGenerator: publicIpKey }),
    asyncHandler(TrackingController.open)
);

export default router;
