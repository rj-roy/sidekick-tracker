import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiRsponse.js";
import { SessionService } from "./session.service.js";

export const SessionController = {
  async getCurrentUser(req: Request, res: Response) {
    return ApiResponse.success(res, "Authenticated", {
      user: req.user,
      session: req.session,
    });
  },

  async logout(req: Request, res: Response) {
    if (req.sessionRaw) {
      await SessionService.destroySession(req.sessionRaw);
    }
    SessionService.clearSessionCookie(res);
    return ApiResponse.success(res, "Logged out");
  },
};