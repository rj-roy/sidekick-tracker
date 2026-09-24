export interface SessionRes {
  user: User;
  session: Session;
};

export type SessionState = |
{ status: "authenticated"; user: User; session: Session; } |
{ status: "unauthenticated"; };

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  googleId: string;
}

export interface Session {
  id: string;
  expiresAt: string;
};