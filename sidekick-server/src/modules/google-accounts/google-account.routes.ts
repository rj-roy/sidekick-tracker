import { Router } from "express";
import { GoogleAccountController } from "./google-account.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createRateLimit, userAwareKey } from "../../middleware/rate-limit.middleware.js";
import { authenticator } from "../../middleware/auth.middleware.js";
import { requireCsrf } from "../../middleware/csrf.middleware.js";

const router = Router();

const ipShield = () => createRateLimit({ windowMs: 60_000, limit: 300 });

const userLimit = (limit: number) =>
    createRateLimit({ windowMs: 60_000, limit, keyGenerator: userAwareKey });

router.get(
    "/",
    ipShield(),
    authenticator,
    userLimit(60),
    asyncHandler(GoogleAccountController.getAccount)
);

router.post(
    "/refresh",
    ipShield(),
    authenticator,
    userLimit(10),
    requireCsrf,
    asyncHandler(GoogleAccountController.refreshToken)
);

router.delete(
    "/",
    ipShield(),
    authenticator,
    userLimit(10),
    requireCsrf,
    asyncHandler(GoogleAccountController.disconnect)
);

export default router;