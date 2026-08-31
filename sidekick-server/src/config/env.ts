import "dotenv/config";
import { ApiError } from "../utils/ApiError.js";

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new ApiError(404, `Missing Env Variable${key}`)
  };

  return value;
}

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
    },
  },

  cookies: {
    raw: getRequiredEnv("RAW_COOKIE_NAME"),
    oauthState: getRequiredEnv("STATE_COOKIE_NAME"),
  },

  google: {
    clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
    clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri: getRequiredEnv("GOOGLE_REDIRECT_URI"),
    authUrl: getRequiredEnv("GOOGLE_AUTH_URL"),
    tokenUrl: getRequiredEnv("GOOGLE_TOKEN_URL"),
    userInfoUrl: getRequiredEnv("GOOGLE_USERINFO_URL"),
  },

  session: {
    secret: getRequiredEnv("SESSION_SECRET"),
    tokenEncryptionKey: getRequiredEnv("TOKEN_ENCRYPTION_KEY"),
  },

  appOrigin: getRequiredEnv("APP_ORIGIN"),
} as const;
