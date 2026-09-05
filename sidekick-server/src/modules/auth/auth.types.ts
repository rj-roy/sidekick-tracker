export interface GoogleTokenResponse {
    access_token: string;
    id_token: string;
    token_type: string;
    expires_in: number;
}

export interface GoogleUserInfo {
    id: string;
    email: string;
    name: string;
    picture?: string;
}