import { ObjectId } from "mongodb";

export interface SessionDoc {
  userId: ObjectId;

  sessionIdHash: string;

  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;

  revokedAt?: Date;
  revokeReason?: string;

  rotatedAt?: Date;
  rotatedToHash?: string;

  userAgent?: string;
  ipAddress?: string;
};