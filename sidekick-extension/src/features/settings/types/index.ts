export interface GoogleAccount {
  email: string;
  scopes?: string[];
  expiresAt?: string;
}

export interface GoogleAccountResponse {
  account: GoogleAccount;
}