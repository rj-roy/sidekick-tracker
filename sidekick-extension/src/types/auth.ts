export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  googleId: string;
}

export type AuthState = "loading" | "logged-out" | "logged-in";