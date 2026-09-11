import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createRateLimit } from "../../middleware/rate-limit.middleware.js";
import { rateLimitStore } from "../../config/rate-limit.js";

const router = Router();

router.get(
    "/google/login",
    createRateLimit({ store: rateLimitStore, windowMs: 60_000, max: 30 }),
    AuthController.googleAuthRedirect
);
router.get(
    "/google/callback",
    createRateLimit({ store: rateLimitStore, windowMs: 10 * 60_000, max: 10 }),
    asyncHandler(AuthController.handleGoogleCallback)
);
// /me and /logout are owned by the session module (session.routes.ts).

export default router;