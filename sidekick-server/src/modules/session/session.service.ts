import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { ObjectId, WithId } from "mongodb";
import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { SessionRepository } from "./session.repository.js";
import type { DeviceInfo, SessionCookiePayload, SessionDoc } from "./session.types.js";

export interface CreateSessionResult {
  token: string;
  rotationKey: string;
  session: WithId<SessionDoc>;
}

export interface ValidateSessionResult {
  session: WithId<SessionDoc>;
  rotated: boolean;
  newToken?: string;
  newRotationKey?: string;
}

export const SessionService = {
  hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  },

  generateSecrets(): { token: string; rotationKey: string } {
    return {
      token: randomBytes(32).toString("base64url"),
      rotationKey: randomBytes(32).toString("base64url"),
    };
  },

  async createSession(userId: ObjectId, device: DeviceInfo, req: Request): Promise<CreateSessionResult> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.session.expiresInSeconds * 1000);

    for (let attempt = 0; attempt < 2; attempt++) {
      const secrets = this.generateSecrets();
      const doc: SessionDoc = {
        tokenHash: this.hash(secrets.token),
        rotationKeyHash: this.hash(secrets.rotationKey),
        userId,
        device,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        expiresAt,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      };

      try {
        const session = await SessionRepository.create(doc);
        return { token: secrets.token, rotationKey: secrets.rotationKey, session };
      } catch (err) {
        if (err instanceof ApiError && err.code === "SESSION_COLLISION" && attempt === 0) {
          continue;
        }
        throw err;
      }
    }

    throw new ApiError(500, "Failed to create session", "SESSION_CREATE_FAILED");
  },

  async validateSession(
    cookiePayload: SessionCookiePayload,
    device: DeviceInfo
  ): Promise<ValidateSessionResult> {
    const tokenHash = this.hash(cookiePayload.token);
    const session = await SessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      throw new ApiError(401, "Not authenticated");
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new ApiError(401, "Session expired", "SESSION_EXPIRED");
    }

    if (session.device?.deviceId !== device.deviceId) {
      throw new ApiError(401, "Untrusted device", "UNTRUSTED_DEVICE");
    }

    const now = new Date();
    const stale =
      now.getTime() - session.updatedAt.getTime() >= env.session.updateAgeSeconds * 1000;

    if (!stale) {
      return { session, rotated: false };
    }

    const secrets = this.generateSecrets();
    const nextExpiresAt = new Date(now.getTime() + env.session.expiresInSeconds * 1000);
    const updated = await SessionRepository.rotate(session.tokenHash, {
      tokenHash: this.hash(secrets.token),
      rotationKeyHash: this.hash(secrets.rotationKey),
      expiresAt: nextExpiresAt,
      lastSeenAt: now,
      updatedAt: now,
    });

    if (!updated) {
      throw new ApiError(401, "Session already rotated", "SESSION_ROTATED");
    }

    return {
      session: updated,
      rotated: true,
      newToken: secrets.token,
      newRotationKey: secrets.rotationKey,
    };
  },

  async destroySession(cookiePayload: SessionCookiePayload): Promise<void> {
    await SessionRepository.destroyByTokenHash(this.hash(cookiePayload.token));
  },

  serializeCookiePayload(payload: SessionCookiePayload): string {
    const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = createHmac("sha256", env.session.secret).update(body).digest("hex");
    return `${body}.${signature}`;
  },

  parseCookieValue(value: string): SessionCookiePayload | null {
    try {
      const dotIndex = value.indexOf(".");
      if (dotIndex <= 0) return null;

      const body = value.slice(0, dotIndex);
      const signature = value.slice(dotIndex + 1);
      const expected = createHmac("sha256", env.session.secret).update(body).digest("hex");

      const received = Buffer.from(signature);
      const wanted = Buffer.from(expected);
      if (received.length !== wanted.length || !timingSafeEqual(received, wanted)) {
        return null;
      }

      const parsed: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
      if (!parsed || typeof parsed !== "object") return null;

      const { token, rotationKey } = parsed as Partial<SessionCookiePayload>;
      if (typeof token !== "string" || !token || typeof rotationKey !== "string" || !rotationKey) {
        return null;
      }

      return { token, rotationKey };
    } catch {
      return null;
    }
  },

  setSessionCookie(res: Response, token: string, rotationKey: string): void {
    const value = this.serializeCookiePayload({ token, rotationKey });
    res.cookie(env.cookies.raw, value, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      maxAge: env.session.expiresInSeconds * 1000,
    });
  },

  clearSessionCookie(res: Response): void {
    res.clearCookie(env.cookies.raw, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
    });
  },
};