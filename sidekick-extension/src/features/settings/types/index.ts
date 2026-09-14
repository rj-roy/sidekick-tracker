export interface GoogleAccount {
  email: string;
  scopes?: string[];
  expiresAt?: string;
}

export interface GoogleAccountResponse {
  account: GoogleAccount;
}

export interface SessionInfo {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrent: boolean;
  isExpired: boolean;
  isRevoked: boolean;
}

export interface SessionsResponse {
  sessions: SessionInfo[];
}