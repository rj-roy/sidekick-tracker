import type { ObjectId } from "mongodb";

export interface GoogleAccountTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  scope?: string;
}

export interface GoogleAccount {
  userId: ObjectId;
  email: string;
  encryptedTokens: string;
  scopes: string[];
  expiresAt?: Date;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}