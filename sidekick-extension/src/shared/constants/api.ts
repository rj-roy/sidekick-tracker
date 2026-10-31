export const API_BASE_URL = "https://sidekick-tracker-web.vercel.app";
export const CLIENT_BASE_URL = "https://sidekick-tracker-web.vercel.app/";
export const GMAIL_COMPOSE_URL = `https://mail.google.com/mail/u/0/#compose`;

export const OPEN_SIGN_IN_MESSAGE = "OPEN_SIGN_IN";
export const GET_COMPOSE_STATE = "GET_COMPOSE_STATE";
export const INJECT_PIXEL = "INJECT_PIXEL";
export const TRACK_EMAIL = "TRACK_EMAIL";
export const EMAIL_SENT = "EMAIL_SENT";

export const isGmailUrl = (url?: string): boolean => !!url?.startsWith(`https://mail.google.com/`);
