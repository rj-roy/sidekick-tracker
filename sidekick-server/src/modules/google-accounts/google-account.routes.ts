import { Router } from "express";
import { GoogleAccountController } from "./google-account.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireCsrf } from "../../middleware/csrf.middleware.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(GoogleAccountController.getAccount));
router.post("/refresh", requireAuth, asyncHandler(GoogleAccountController.refreshToken));
router.delete("/", requireAuth, requireCsrf, asyncHandler(GoogleAccountController.disconnect));

export default router;