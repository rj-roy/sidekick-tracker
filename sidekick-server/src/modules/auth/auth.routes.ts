import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createRateLimit } from "../../middleware/rate-limit.middleware.js";
import { authenticator } from "../../middleware/auth.middleware.js";
import { requireCsrf } from "../../middleware/csrf.middleware.js";

const router = Router();

router.get(
    "/google/login",
    createRateLimit({ windowMs: 10 * 60_000, limit: 10 }),
    AuthController.googleAuthRedirect
);
router.get(
    "/google/callback",
    createRateLimit({ windowMs: 10 * 60_000, limit: 10 }),
    asyncHandler(AuthController.handleGoogleCallback)
);
router.get(
    "/me",
    authenticator,
    createRateLimit({ windowMs: 60_000, limit: 60 }),
    asyncHandler(AuthController.getMe)
);
router.get(
    "/csrf",
    authenticator,
    createRateLimit({ windowMs: 60_000, limit: 30 }),
    asyncHandler(AuthController.getCsrfToken)
);
router.get(
    "/sessions",
    authenticator,
    createRateLimit({ windowMs: 60_000, limit: 30 }),
    asyncHandler(AuthController.listSessions)
);
router.delete(
    "/sessions/:sessionId",
    authenticator,
    requireCsrf,
    createRateLimit({ windowMs: 60_000, limit: 15 }),
    asyncHandler(AuthController.revokeSession)
);
router.post(
    "/logout-all",
    authenticator,
    requireCsrf,
    createRateLimit({ windowMs: 60_000, limit: 10 }),
    asyncHandler(AuthController.logoutAll)
);
router.post(
    "/logout",
    authenticator,
    requireCsrf,
    createRateLimit({ windowMs: 60_000, limit: 10 }),
    asyncHandler(AuthController.logout)
);

export default router;