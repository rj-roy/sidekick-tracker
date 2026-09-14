import type { CookieOptions } from "express";
import { env } from "../config/env.js";

export const cookieOptions = (maxAgeMs: number): CookieOptions => ({
  httpOnly: true,
  secure: env.cookies.secure,
  sameSite: "lax",
  path: "/",
  maxAge: maxAgeMs,
});

export const clearCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.cookies.secure,
  sameSite: "lax",
  path: "/",
});