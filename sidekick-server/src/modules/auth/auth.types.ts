export interface GoogleTokenResponse {
    access_token: string;
    id_token: string;
    token_type: string;
    expires_in: number;
    scope?: string;
    refresh_token?: string;
};

export interface GoogleUserInfo {
    id: string;
    email: string;
    name: string;
    picture?: string;
    verified_email?: boolean;
};

export interface StoredGoogleTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
}