import express from "express";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

import { authRouter } from "./modules/auth/index.js";
import { googleAccountsRouter } from "./modules/google-accounts/index.js";
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

// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       useDefaults: false,
//       directives: {
//         defaultSrc: ["'none'"],
//         connectSrc: ["'self'"],
//         frameAncestors: ["'none'"],
//       },
//     },
//     crossOriginResourcePolicy: { policy: "same-origin" },
//     crossOriginOpenerPolicy: { policy: "same-origin" },
//     referrerPolicy: { policy: "no-referrer" },
//     strictTransportSecurity: env.isProduction
//       ? { maxAge: 15_552_000, includeSubDomains: true }
//       : false,
//   })
// );

// app.use((_req, res, next) => {
//   res.setHeader(
//     "Permissions-Policy",
//     "camera=(), microphone=(), geolocation=(), browsing-topics=()"
//   );
//   next();
// });

// const trustedOrigin = (origin: string | undefined): boolean =>
//   !origin || env.appOrigins.includes(origin) || env.appExtensions.includes(origin);

// app.use(
//   cors({
//     origin(origin, callback) {
//       if (trustedOrigin(origin)) return callback(null, true);
//       return callback(null, false);
//     },
//     credentials: true,
//     exposedHeaders: ["x-csrf-token", "x-session-token"],
//   })
// );

app.use(express.json({ 
  limit: "10kb",
  verify: (req, _res, buf) => {(req as any).rawBody = buf},
}));

app.use(verifyClientReq);
app.use(cookieParser())

app.get("/api/health", async (_req, res) => {
    res.json({ status: "ok", message: "Server is runnig perfectly" });
});

app.use('/auth', authRouter);
app.use('/google-accounts', googleAccountsRouter);

app.use(notFound);
app.use(errorHandler);

export { app };