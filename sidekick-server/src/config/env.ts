import "dotenv/config";
import { ApiError } from "../utils/ApiError.js";

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];

  if (!value || value.trim() === "") {
    throw new ApiError(500, `Missing required environment variable: ${key}`);
  }

  return value.trim();
};

const getOriginsEnv = (key: string): string[] => {
  const value = process.env[key];

  if (!value || value.trim() === "") {
    throw new ApiError(500, `Missing required environment variable: ${key}`);
  }

  return value.split(",").map((origin) => origin.trim()).filter(Boolean);
};

const positiveInt = (key: string, fallback: number): number => {
  const raw = process.env[key] === undefined || process.env[key] === "" ? fallback : process.env[key];
  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new ApiError(500, `Environment variable ${key} must be a positive integer`);
  }

  return value;
};

const nonNegativeInt = (key: string, fallback: number): number => {
  const raw = process.env[key] === undefined || process.env[key] === "" ? fallback : process.env[key];
  const value = Number(raw);

  if (!Number.isInteger(value) || value < 0) {
    throw new ApiError(500, `Environment variable ${key} must be a non-negative integer`);
  }

  return value;
};

const nodeEnv = getRequiredEnv("NODE_ENV");
const isProduction = nodeEnv === "production";

const port = positiveInt("PORT", 5000);

const hostify = (name: string): string =>
  isProduction && !name.startsWith("__Host-") ? `__Host-${name}` : name;

const shannonEntropy = (value: string): number => {
  const freq: Record<string, number> = {};
  for (const ch of value) freq[ch] = (freq[ch] ?? 0) + 1;

  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }

  return entropy;
};

const sessionSecret = getRequiredEnv("SESSION_SECRET");
if (sessionSecret.length < 32) {
  throw new ApiError(500, "SESSION_SECRET must be at least 32 characters long");
}

if (shannonEntropy(sessionSecret) < 3) {
  throw new ApiError(
    500,
    "SESSION_SECRET has insufficient entropy; generate one with: openssl rand -base64 48"
  );
}

const tokenEncryptionKey = getRequiredEnv("TOKEN_ENCRYPTION_KEY");
const tokenEncryptionKeyBytes = Buffer.from(tokenEncryptionKey, "base64");
if (tokenEncryptionKeyBytes.length !== 32) {
  throw new ApiError(500, "TOKEN_ENCRYPTION_KEY must be a 32-byte base64 encoded value");
}

if (new Set(tokenEncryptionKeyBytes).size <= 1) {
  throw new ApiError(500, "TOKEN_ENCRYPTION_KEY must not be a repeated-byte key");
}

const sessionExpiresInSeconds = positiveInt("SESSION_EXPIRES_IN_SECONDS", 604800);
const rotationIntervalSeconds = nonNegativeInt("SESSION_ROTATION_INTERVAL_SECONDS", 86400);
const rotationGraceSeconds = nonNegativeInt("SESSION_ROTATION_GRACE_SECONDS", 15);
const revokeOnHighRiskAnomaly =
  (process.env.REVOKE_ON_HIGH_RISK_ANOMALY ?? "true").toLowerCase() === "true";

if (isProduction) {
  const httpsOnlySettings = ["GOOGLE_REDIRECT_URL"].filter(
    (key) => process.env[key]?.startsWith("http://")
  );

  if (httpsOnlySettings.length > 0) {
    throw new ApiError(
      500,
      `In production, the following settings must be HTTPS: ${httpsOnlySettings.join(", ")}`
    );
  }
}

const appOrigins = getOriginsEnv("APP_ORIGINS");
const invalidOrigins = appOrigins.filter((origin) => {
  try {
    new URL(origin);
    return false;
  } catch {
    return true;
  }
});
if (invalidOrigins.length > 0) {
  throw new ApiError(500, `APP_ORIGINS contains invalid URLs: ${invalidOrigins.join(", ")}`);
}

const rawExtensionIds = process.env.CHROME_EXTENSION_ID;
const extensionIds = rawExtensionIds
  ? rawExtensionIds.split(",").map((id) => id.trim()).filter(Boolean)
  : [];
const appExtensions = extensionIds.map((id) => `chrome-extension://${id}`);

if (appExtensions.length === 0) {
  if (isProduction) {
    throw new ApiError(500, "CHROME_EXTENSION_ID must not be empty in production");
  }
  console.warn(
    "[env] CHROME_EXTENSION_ID is empty; requests from the extension will be rejected"
  );
}

const trustProxy =
  process.env.TRUST_PROXY === undefined || process.env.TRUST_PROXY === ""
    ? (isProduction ? 1 : 0)
    : positiveInt("TRUST_PROXY", 1);

const rateLimitRedisUrl = process.env.REDIS_URL?.trim() || undefined;

export const env = {
  nodeEnv,
  isProduction,
  port,
  trustProxy,
  httpsEnforced: isProduction,

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
    raw: hostify(getRequiredEnv("RAW_COOKIE_NAME")),
    oauthState: hostify(getRequiredEnv("STATE_COOKIE_NAME")),
    oauthVerifier: hostify(getRequiredEnv("VERIFIER_COOKIE_NAME")),
    secure: isProduction,
    hostPrefix: isProduction && !getRequiredEnv("RAW_COOKIE_NAME").startsWith("__Host-"),
  },

  google: {
    clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
    clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    redirectUrl: getRequiredEnv("GOOGLE_REDIRECT_URL"),
    authUrl: getRequiredEnv("GOOGLE_AUTH_URL"),
    tokenUrl: getRequiredEnv("GOOGLE_TOKEN_URL"),
    userInfoUrl: getRequiredEnv("GOOGLE_USERINFO_URL"),
    revokeUrl: getRequiredEnv("GOOGLE_REVOKE_URL"),
    gmailApiUrl: getRequiredEnv("GOOGLE_GMAIL_API_URL"),
    scope: getRequiredEnv("GOOGLE_SCOPE"),
    tokenRefreshThresholdSeconds: positiveInt("GOOGLE_TOKEN_REFRESH_THRESHOLD", 300),
  },

  session: {
    secret: sessionSecret,
    tokenEncryptionKey: tokenEncryptionKey,
    expiresInSeconds: sessionExpiresInSeconds,
    rotationIntervalSeconds,
    rotationGraceSeconds,
    revokeOnHighRiskAnomaly,
  },

  jobs: {
    emailPollIntervalMs: positiveInt("EMAIL_POLL_INTERVAL_MS", 5 * 60 * 1000),
    trackingCleanupIntervalMs: positiveInt("TRACKING_CLEANUP_INTERVAL_MS", 24 * 60 * 60 * 1000),
    sessionCleanupIntervalMs: positiveInt("SESSION_CLEANUP_INTERVAL_MS", 24 * 60 * 60 * 1000),
    trackingRetentionDays: positiveInt("TRACKING_RETENTION_DAYS", 30),
    sessionRetentionDays: positiveInt("SESSION_RETENTION_DAYS", 90),
  },

  appOrigins,
  appExtensions,

  rateLimit: {
    redisUrl: rateLimitRedisUrl,
  },
} as const;