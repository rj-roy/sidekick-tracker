import { Router } from "express";
import { AuthController } from "./auth.controller.js";

const router = Router();

router.get("/google/login", AuthController.googleAuthRedirect);
router.get("/google/callback", AuthController.handleGoogleCallback);
// router.get("/me", AuthController.getCurrentUser);
// router.post("/logout", AuthController.logout);

export default router;
