import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createRateLimit, userAwareKey } from "../../middleware/rate-limit.middleware.js";
import { authenticator } from "../../middleware/auth.middleware.js";
import { requireCsrf } from "../../middleware/csrf.middleware.js";

const router = Router();

const ipShield = () => createRateLimit({ windowMs: 60_000, limit: 300 });

const userLimit = (windowMs: number, limit: number) =>
    createRateLimit({ windowMs, limit, keyGenerator: userAwareKey });

//reviewed
router.get(
    "/google/login",
    createRateLimit({ windowMs: 10 * 60_000, limit: 10 }),
    AuthController.googleAuthRedirect
);

//reviewed
router.get(
    "/google/callback",
    createRateLimit({ windowMs: 10 * 60_000, limit: 10 }),
    asyncHandler(AuthController.handleGoogleCallback)
);

//reviewed
router.get(
    "/me",
    ipShield(),
    authenticator,
    userLimit(60_000, 60),
    asyncHandler(AuthController.getMe)
);

//reviewed only server-side
router.get(
    "/csrf",
    ipShield(),
    authenticator,
    userLimit(60_000, 30),
    asyncHandler(AuthController.getCsrfToken)
);

//reviewed
router.get(
    "/sessions",
    ipShield(),
    authenticator,
    userLimit(60_000, 30),
    asyncHandler(AuthController.sessionList)
);

//reviewed, todo: this is not "delete" its "update"
router.delete(
    "/sessions/:sessionId",
    ipShield(),
    authenticator,
    requireCsrf,
    userLimit(60_000, 15),
    asyncHandler(AuthController.revokeSession)
);

//reviewed
router.post(
    "/logout-all",
    ipShield(),
    authenticator,
    requireCsrf,
    userLimit(60_000, 10),
    asyncHandler(AuthController.logoutAll)
);

//reviewed
router.post(
    "/logout",
    ipShield(),
    authenticator,
    requireCsrf,
    userLimit(60_000, 3),
    asyncHandler(AuthController.logout)
);

export default router;