export interface SessionRes {
  user: User;
  session: Session;
};

export type SessionState = |
{ status: "loading" } |
{ status: "authenticated"; user: User } |
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