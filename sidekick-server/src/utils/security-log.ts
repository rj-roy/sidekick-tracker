export type SecurityEvent =
  | "OAUTH_LOGIN_SUCCESS"
  | "OAUTH_LOGIN_FAILURE"
  | "OAUTH_STATE_MISMATCH"
  | "SESSION_CREATED"
  | "SESSION_ROTATED"
  | "SESSION_REVOKED"
  | "SESSION_REVOKED_ALL"
  | "SESSION_EXPIRED"
  | "SESSION_INVALID"
  | "SESSION_IP_CHANGED"
  | "SESSION_UA_CHANGED"
  | "CSRF_FAILURE"
  | "INVALID_ID_TOKEN"
  | "GOOGLE_ACCOUNT_CONNECTED"
  | "GOOGLE_ACCOUNT_DISCONNECTED"
  | "TOKEN_REFRESH_FAILURE";

const FORBIDDEN_KEYS = new Set(["token", "accessToken", "refreshToken", "id_token"]);

const sanitize = (meta: Record<string, unknown>): Record<string, unknown> => {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    clean[key] = value;
  }
  return clean;
};

export const logSecurityEvent = (
  event: SecurityEvent,
  meta: Record<string, unknown> = {}
): void => {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "security",
      event,
      meta: sanitize(meta),
    })
  );
};