import "dotenv/config";
import { ApiError } from "../utils/ApiError.js";

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];

  if (!value || value.trim() === "") {
    throw new ApiError(500, `Missing required environment variable: ${key}`);
  };

  return value.trim();
};

const getOriginsEnv = (key: string): string[] => {
  const value = process.env[key];

  if (!value || value.trim() === "") {
    throw new ApiError(500, `Missing required environment variable: ${key}`);
  };

  return value.split(",").map((origin) => origin.trim()).filter(Boolean);
};

export const env = {
  nodeEnv: getRequiredEnv("NODE_ENV"),
  port: Number(process.env.PORT),

  mongodb: {
    uri: getRequiredEnv("MONGODB_URI"),
    dbName: getRequiredEnv("MONGODB_DB_NAME"),
    collections: {
      users: getRequiredEnv("USER_COLLECTION"),
      trackedEmails: getRequiredEnv("TRACKED_EMAILS_COLL"),
      emailOpens: getRequiredEnv("OPEN_EMAIL_COLL"),
      googleAccounts: getRequiredEnv("GOOGLE_ACCOUNTS_COLLECTION"),
      sessions: getRequiredEnv("SESSIONS_COLLECTION"),
    },
  },

  cookies: {
    raw: getRequiredEnv("RAW_COOKIE_NAME"),
    oauthState: getRequiredEnv("STATE_COOKIE_NAME"),
  },

  google: {
    clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
    clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    redirectUrl: getRequiredEnv("GOOGLE_REDIRECT_URL"),
    authUrl: getRequiredEnv("GOOGLE_AUTH_URL"),
    tokenUrl: getRequiredEnv("GOOGLE_TOKEN_URL"),
    userInfoUrl: getRequiredEnv("GOOGLE_USERINFO_URL"),
    gmailApiUrl: getRequiredEnv("GOOGLE_GMAIL_API_URL"),
    scope: getRequiredEnv("GOOGLE_SCOPE"),
    tokenRefreshThresholdSeconds: Number(process.env.GOOGLE_TOKEN_REFRESH_THRESHOLD || 300),
  },

  session: {
    secret: getRequiredEnv("SESSION_SECRET"),
    tokenEncryptionKey: getRequiredEnv("TOKEN_ENCRYPTION_KEY"),
    expiresInSeconds: Number(process.env.SESSION_EXPIRES_IN_SECONDS || 604800),
  },

  appOrigins: getOriginsEnv("APP_ORIGINS"),
} as const;
