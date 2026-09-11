import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createRateLimit } from "../../middleware/rate-limit.middleware.js";

const router = Router();

router.get(
    "/google/login",
    createRateLimit({ windowMs: 60_000, limit: 30 }),
    AuthController.googleAuthRedirect
);
router.get(
    "/google/callback",
    createRateLimit({ windowMs: 10 * 60_000, limit: 10 }),
    asyncHandler(AuthController.handleGoogleCallback)
);

export default router;