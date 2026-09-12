import { ObjectId } from "mongodb";

export interface SessionDoc {
  userId: ObjectId;

  sessionIdHash: string;

  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;

  revokedAt?: Date;
  revokeReason?: string;

  userAgent?: string;
  ipAddress?: string;
};