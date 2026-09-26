import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { logSecurityEvent } from "../utils/security-log.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

//reviewed
export const csrfTokenFor = (sessionId: string): string => {
  return createHmac("sha256", env.session.secret).update(sessionId).digest("base64url");
};

// //reviewed
// const isTrustedOrigin = (origin: string): boolean => {
//   if (env.appOrigins.includes(origin)) return true;
//   if (env.appExtensions.includes(origin)) return true;
//   return false;
// };

// //reviewed
// export const requireCsrf = (req: Request, _res: Response, next: NextFunction) => {
//   if (SAFE_METHODS.has(req.method)) return next();

//   const origin = req.get("origin");
//   if (origin && !isTrustedOrigin(origin)) {
//     logSecurityEvent("CSRF_FAILURE", { reason: "untrusted-origin(RCF)", path: req.path });
//     throw new ApiError(403, "Untrusted origin");
//   }

//   const headerToken = req.get("x-csrf-token");
//   if (!req.sessionId || !headerToken) {
//     logSecurityEvent("CSRF_FAILURE", { reason: "missing-cs-token", path: req.path });
//     throw new ApiError(403, "Invalid or missing CSRF token");
//   };

//   const expected = Buffer.from(csrfTokenFor(req.sessionId));
//   const actual = Buffer.from(headerToken);

//   if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
//     logSecurityEvent("CSRF_FAILURE", { reason: "mismatch", path: req.path });
//     throw new ApiError(403, "Invalid or missing CSRF token");
//   }

//   next();
// };