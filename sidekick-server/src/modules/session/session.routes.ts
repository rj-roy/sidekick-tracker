import { Router, type NextFunction, type Request, type Response } from "express";
import { SessionController } from "./session.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createRateLimit } from "../../middleware/rate-limit.middleware.js";
import { rateLimitStore } from "../../config/rate-limit.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { ApiError } from "../../utils/ApiError.js";

const router = Router();

const logoutCsrfGuard = (req: Request, _res: Response, next: NextFunction) => {
  if (req.is("application/json") || req.get("X-Requested-With") === "XMLHttpRequest") {
    return next();
  }
  return next(new ApiError(403, "Invalid request", "CSRF"));
};

router.get(
  "/me",
  requireAuth,
  createRateLimit({ store: rateLimitStore, windowMs: 60_000, max: 60, keyFn: (r) => r.userId! }),
  asyncHandler(SessionController.getCurrentUser)
);

router.post(
  "/logout",
  requireAuth,
  logoutCsrfGuard,
  createRateLimit({ store: rateLimitStore, windowMs: 60_000, max: 20, keyFn: (r) => r.userId! }),
  asyncHandler(SessionController.logout)
);

export default router;