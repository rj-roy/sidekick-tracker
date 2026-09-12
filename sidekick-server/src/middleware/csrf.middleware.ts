import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const csrfTokenFor = (sessionToken: string): string =>
  createHmac("sha256", env.session.secret).update(sessionToken).digest("base64url");

const isTrustedOrigin = (origin: string): boolean => {
  if (env.appOrigins.includes(origin)) return true;
  if (origin.startsWith("chrome-extension://")) return true;
  return false;
};

export const requireCsrf = (req: Request, _res: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  if (origin && !isTrustedOrigin(origin)) {
    throw new ApiError(403, "Untrusted origin");
  }

  const headerToken = req.get("x-csrf-token");
  if (!req.sessionToken || !headerToken) {
    throw new ApiError(403, "Invalid or missing CSRF token");
  }

  const expected = Buffer.from(csrfTokenFor(req.sessionToken));
  const actual = Buffer.from(headerToken);

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new ApiError(403, "Invalid or missing CSRF token");
  }

  next();
};