import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

const getCsrfCookieName = () => `${env.cookies.raw}_csrf`;

export const requireCsrf = (req: Request, _res: Response, next: NextFunction) => {
  const csrfCookieName = getCsrfCookieName();
  const cookieToken = req.cookies?.[csrfCookieName];
  const headerToken = req.get("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new ApiError(403, "Invalid or missing CSRF token");
  }

  next();
};

export const setCsrfCookie = (res: Response, token: string) => {
  res.cookie(getCsrfCookieName(), token, {
    httpOnly: false,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    maxAge: env.session.expiresInSeconds * 1000,
  });
};
