// import { Router } from "express";
// import { asyncHandler } from "../../utils/http/async-handler.js";
// import { createRateLimit } from "../../middleware/rate-limit.middleware.js";
// import { TrackingController } from "./tracking.controller.js";

// const router = Router();

// // hit by mail clients (gmail image proxy, outlook, apple mail) — no HMAC signature available,
// // so this router is mounted before verifyClientReq and must stay free of auth middleware
// router.get(
//     "/open/:token",
//     createRateLimit({ windowMs: 60_000, limit: 120 }),
//     asyncHandler(TrackingController.open)
// );

// export default router;
