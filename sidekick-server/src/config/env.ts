import "dotenv/config";
import { ApiError } from "../utils/ApiError.js";

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];

  if (!value || value.trim() === "") {
    throw new ApiError(500, `Missing required environment variable: ${key}`);
  };

  return value.trim();
};

const getFallbackEnv = (key: string, fallback: string): string => {
  const value = process.env[key];
  return value && value.trim() !== "" ? value.trim() : fallback;
};

const getOriginsEnv = (key: string): string[] => {
  const value = process.env[key];

  if (!value || value.trim() === "") {
    throw new ApiError(500, `Missing required environment variable: ${key}`);
  };

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const env = {
  nodeEnv: getFallbackEnv("NODE_ENV", "development"),
  port: Number(process.env.PORT),

  mongodb: {
    uri: getRequiredEnv("MONGODB_URI"),
    dbName: getRequiredEnv("MONGODB_DB_NAME"),
    collections: {
      users: getRequiredEnv("USER_COLLECTION"),
      trackedEmails: getRequiredEnv("TRACKED_EMAILS_COLL"),
      emailOpens: getRequiredEnv("OPEN_EMAIL_COLL"),
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
  },

  session: {
    secret: getRequiredEnv("SESSION_SECRET"),
    tokenEncryptionKey: getRequiredEnv("TOKEN_ENCRYPTION_KEY"),
  },

  appOrigins: getOriginsEnv("APP_ORIGINS"),
} as const;
