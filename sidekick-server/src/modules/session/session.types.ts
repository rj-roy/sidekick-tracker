import type { ObjectId, WithId } from "mongodb";

export interface DeviceInfo {
  deviceId: string;
  platform: string;
  os: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  deviceType?: string;
  screen?: { width: number; height: number };
  language?: string;
  timezone?: string;
  userAgent?: string;
  isMobile?: boolean;
  fingerprints?: Record<string, unknown>;
}

export interface SessionCookiePayload {
  token: string;
  rotationKey: string;
}

export interface SessionDoc {
  tokenHash: string;
  rotationKeyHash: string;
  userId: ObjectId;
  device: DeviceInfo;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type StoredSession = WithId<SessionDoc>;