import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createRateLimit } from "../../middleware/rate-limit.middleware.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

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
router.get("/me", requireAuth, asyncHandler(AuthController.getMe));
router.post("/logout", requireAuth, asyncHandler(AuthController.logout));

export default router;