import { env } from "../../config/env.js";

export const SESSION_FIELDS = {
  tokenHash: "tokenHash",
  rotationKeyHash: "rotationKeyHash",
  userId: "userId",
  device: "device",
  ipAddress: "ipAddress",
  userAgent: "userAgent",
  expiresAt: "expiresAt",
  lastSeenAt: "lastSeenAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;

export const sessionCollectionName = () => env.mongodb.collections.sessions;