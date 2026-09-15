import type { CookieOptions } from "express";
import { env } from "../config/env.js";

//reviewed
export const cookieOptions = (maxAgeMs: number): CookieOptions => ({
  httpOnly: true,
  secure: env.cookies.secure,
  sameSite: "lax",
  path: "/",
  maxAge: maxAgeMs,
});

// reviewed
export const clearCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.cookies.secure,
  sameSite: "lax",
  path: "/",
});