import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

import { authRouter } from "./modules/auth/index.js";
import { googleAccountsRouter } from "./modules/google-accounts/index.js";
import cookieParser from "cookie-parser";

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

app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser())

app.use(cors({
    origin: env.appOrigins,
    credentials: true,
}));

app.get("/api/health", async (_req, res) => {
    res.json({ status: "ok", message: "Server is runnig perfectly" });
});

app.use('/auth', authRouter);
app.use('/google-accounts', googleAccountsRouter);

app.use(notFound);
app.use(errorHandler);

export { app };