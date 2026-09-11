import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { SessionService } from "../modules/session/session.service.js";
import { parseDeviceInfo } from "../modules/session/session.validation.js";
import { AuthRepository } from "../modules/auth/auth.repository.js";

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawCookie = req.cookies?.[env.cookies.raw];
    const cookiePayload = SessionService.parseCookieValue(typeof rawCookie === "string" ? rawCookie : "");

    if (!cookiePayload) {
      throw new ApiError(401, "Not authenticated");
    }

    let device;
    try {
      device = parseDeviceInfo(req.get(env.session.deviceHeader));
    } catch {
      throw new ApiError(401, "Not authenticated");
    }

    const result = await SessionService.validateSession(cookiePayload, device);

    if (result.rotated && result.newToken && result.newRotationKey) {
      SessionService.setSessionCookie(res, result.newToken, result.newRotationKey);
    }

    const user = await AuthRepository.findById(result.session.userId);

    if (!user) {
      throw new ApiError(401, "Not authenticated");
    }

    req.user = user;
    req.session = result.session;
    req.userId = user._id.toString();
    req.sessionRaw = cookiePayload;

    next();
  } catch (err) {
    next(err);
  }
};