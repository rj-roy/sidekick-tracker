import { ObjectId } from "mongodb";

export interface SessionDoc {
  userId: ObjectId;

  sessionIdHash: string;
  rotationKeyHash: string;

  rotatedAt?: Date;
  
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;

  revokedAt?: Date;
  revokeReason?: string;

  userAgent?: string;
  deviceId?: string;
  ipAddress?: string;
  lastIpAddress?: string;
};