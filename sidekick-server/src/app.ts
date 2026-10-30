import express from "express";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

import { authRouter } from "./modules/auth/index.js";
import { trackingRouter, publicTrackingRouter } from "./modules/tracking/index.js";
import cookieParser from "cookie-parser";
import { verifyClientReq } from "./middleware/verifyClientReq.js";

const app = express();

app.set("trust proxy", env.trustProxy);

if (env.httpsEnforced) {
  app.use((req, res, next) => {
    if (req.secure) return next();
    res.status(403).json({
      success: false,
      message: "HTTPS required",
      error: "HTTPS_REQUIRED",
    });
  });
}

app.use(express.json({ 
  limit: "10kb",
  verify: (req, _res, buf) => {(req as any).rawBody = buf},
}));

app.use(verifyClientReq);
app.use(cookieParser())

app.get("/api/health", async (_req, res) => {
    res.json({ status: "ok", message: "Server is runnig perfectly" });
});

app.use("/pixel", publicTrackingRouter);
app.use("/tracking", trackingRouter);
app.use('/auth', authRouter);


app.use(notFound);
app.use(errorHandler);

export { app };