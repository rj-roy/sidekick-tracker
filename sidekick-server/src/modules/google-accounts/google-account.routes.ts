import { Router } from "express";
import type { Request } from "express";
import { ipKeyGenerator } from "express-rate-limit";
import { GoogleAccountController } from "./google-account.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createRateLimit } from "../../middleware/rate-limit.middleware.js";
import { authenticator } from "../../middleware/auth.middleware.js";
import { requireCsrf } from "../../middleware/csrf.middleware.js";

const userAwareKey = (req: Request): string =>
  `${ipKeyGenerator(req.ip ?? "anon")}:${req.userId?.toHexString() ?? "anon"}`;

const router = Router();

router.get(
    "/",
    authenticator,
    createRateLimit({ windowMs: 60_000, limit: 60, keyGenerator: userAwareKey }),
    asyncHandler(GoogleAccountController.getAccount)
);

router.post(
    "/refresh",
    authenticator,
    createRateLimit({ windowMs: 60_000, limit: 10, keyGenerator: userAwareKey }),
    requireCsrf,
    asyncHandler(GoogleAccountController.refreshToken)
);

router.delete(
    "/",
    authenticator,
    createRateLimit({ windowMs: 60_000, limit: 10, keyGenerator: userAwareKey }),
    requireCsrf,
    asyncHandler(GoogleAccountController.disconnect)
);

export default router;