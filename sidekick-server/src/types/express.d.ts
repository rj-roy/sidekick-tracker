import type { WithId } from "mongodb";
import type { SessionCookiePayload, SessionDoc } from "../modules/session/session.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: WithId<Record<string, unknown>>;
      session?: SessionDoc;
      userId?: string;
      sessionRaw?: SessionCookiePayload;
    }
  }
}

export {};