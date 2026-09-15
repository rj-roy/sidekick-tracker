import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createRateLimit, userAwareKey } from "../../middleware/rate-limit.middleware.js";
import { authenticator } from "../../middleware/auth.middleware.js";
import { requireCsrf } from "../../middleware/csrf.middleware.js";

const router = Router();

// cheap IP-based DoS shield: runs before auth, so unauthenticated floods never
// reach the session DB lookup. One fresh instance per route.
const ipShield = () => createRateLimit({ windowMs: 60_000, limit: 300 });

// per-user limits: run after auth, keyed by ip:userId
const userLimit = (windowMs: number, limit: number) =>
    createRateLimit({ windowMs, limit, keyGenerator: userAwareKey });

//public, IP-keyed only (default keyGenerator)
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
    ipShield(),
    authenticator,
    userLimit(60_000, 60),
    asyncHandler(AuthController.getMe)
);
router.get(
    "/csrf",
    ipShield(),
    authenticator,
    userLimit(60_000, 30),
    asyncHandler(AuthController.getCsrfToken)
);
router.get(
    "/sessions",
    ipShield(),
    authenticator,
    userLimit(60_000, 30),
    asyncHandler(AuthController.listSessions)
);
router.delete(
    "/sessions/:sessionId",
    ipShield(),
    authenticator,
    requireCsrf,
    userLimit(60_000, 15),
    asyncHandler(AuthController.revokeSession)
);
router.post(
    "/logout-all",
    ipShield(),
    authenticator,
    requireCsrf,
    userLimit(60_000, 10),
    asyncHandler(AuthController.logoutAll)
);
router.post(
    "/logout",
    ipShield(),
    authenticator,
    requireCsrf,
    userLimit(60_000, 10),
    asyncHandler(AuthController.logout)
);

export default router;