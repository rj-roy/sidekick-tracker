import { Router } from "express";
import { asyncHandler } from "../../utils/http/async-handler.js";
import { createRateLimit, userAwareKey } from "../../middleware/rate-limit.middleware.js";
import { authenticator } from "../../middleware/authenticator.js";
import { requireCsrf } from "../../middleware/csrf.middleware.js";
import { TrackingController } from "./tracking.controller.js";

const router = Router();

router.post(
    "/create",
    createRateLimit({ windowMs: 60_000, limit: 30, keyGenerator: userAwareKey }),
    authenticator,
    requireCsrf,
    asyncHandler(TrackingController.create)
);

export default router;
