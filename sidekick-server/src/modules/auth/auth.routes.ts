import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { asyncHandler } from "../../utils/http/async-handler.js";
import { createRateLimit, userAwareKey } from "../../middleware/rate-limit.middleware.js";
import { authenticator } from "../../middleware/authenticator.js";
import { requireCsrf } from "../../middleware/csrf.middleware.js";

const router = Router();

const ipShield = () => createRateLimit({ windowMs: 60_000, limit: 300 });

const userLimit = (windowMs: number, limit: number) =>
    createRateLimit({ windowMs, limit, keyGenerator: userAwareKey });

router.get(
    "/google/login",
    createRateLimit({ windowMs: 10 * 60_000, limit: 10 }),
    AuthController.googleAuthRedirect
);

router.post(
    "/google/callback",
    createRateLimit({ windowMs: 10 * 60_000, limit: 10 }),
    asyncHandler(AuthController.handleGoogleCallback)
);

router.get(
    "/get/session",
    ipShield(),
    authenticator,
    userLimit(60_000, 60),
    asyncHandler(AuthController.getSession)
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