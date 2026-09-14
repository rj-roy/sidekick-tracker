# SideKick Security Hardening — Implementation Report

Date: 2026-09-14

All items from `todo.txt` (and related hardening items from the audit) have been implemented.
Both the server (`sidekick-server`) and the extension (`sidekick-extension`) were updated and compile cleanly
(`npm run build` passes for both).

---

## P0 — High priority

### 1. Session rotation race conditions (atomic)

**Before:** `rotateSessionToken()` did a non-atomic "insert new session → mark old rotated", so two concurrent
requests could both rotate the same session and create two replacements.

**Now:** `session.repository.ts` adds `claimRotation()` — an atomic conditional update that claims the old session
(`rotatedAt: { $exists: false }`, `revokedAt: { $exists: false }`). The flow is:

```
insert new session (fresh token) → atomically claim old session → return replacement token
if claim fails (someone else won) → delete the orphan row we just inserted → return null → request continues on the
grace-path with the existing token
```

Only one replacement session can ever be created per rotation.

### 2. Rotated-session handling / CSRF–session identity sync

**Before:** on rotation the middleware kept `req.sessionId` pointing at the old session and never told the client
about the new session, so the CSRF token (HMAC over session `_id`) no longer matched after rotation.

**Now:**
- `validateSession()` returns the new `rotatedSessionId` together with `rotatedToken`.
- `auth.middleware.ts` updates `req.sessionId`, sets the replacement cookie, and emits the CSRF token for the new
  session as an `x-csrf-token` response header.
- The extension stores that header (`shared/utils/apiRequest.ts`), so the stored CSRF token always matches the
  active session.
- Sessions that were superseded (`rotatedToHash` set) are excluded from the session-management listing.

### 3. PKCE for Google OAuth

- `utils/pkce.ts`: generates a `code_verifier` + S256 `code_challenge` and a `nonce`.
- `/google/login` stores `state` in the OAuth-state cookie and `{verifier, nonce}` in a new short-lived HttpOnly
  verifier cookie (`VERIFIER_COOKIE_NAME`), then redirects to Google with `code_challenge`,
  `code_challenge_method=S256`, and `nonce`.
- The callback reads the stored verifier, sends it as `code_verifier` in the token exchange, and verifies the `nonce`
  claim inside the ID token.
- Both cookies are cleared after a successful login.

### 4. Google ID-token verification

New `utils/google-jwt.ts` fully verifies the `id_token` before trusting it:
- signature (RS256) against Google's published JWKS (`https://www.googleapis.com/oauth2/v3/certs`) with caching that
  honours `Cache-Control` and automatic key rotation retry;
- `alg === "RS256"`;
- `iss` ∈ {`https://accounts.google.com`, `accounts.google.com`};
- `aud === GOOGLE_CLIENT_ID`;
- `exp` / `iat` with 30 s clock skew;
- `nonce` (when present);
- `sub` present.

`auth.service.ts` now uses the verified token claims (`sub`, `email`, `email_verified`, `name`, `picture`) as the
primary identity source; the user-info endpoint is only used as a fallback when the token lacks a verified email
(and the `sub` must still match).

### 5. Strict `chrome-extension://` origin restriction

**Before:** `isTrustedOrigin()` accepted any `chrome-extension://` origin via `startsWith`.

**Now:** only origins derived from the configured `CHROME_EXTENSION_ID` env var (comma-separated IDs) are trusted.
Set the ID in your env; an empty value trusts no extension origin.

### 6. `__Host-` prefixed cookies in production

`env.cookies.raw`, `.oauthState`, `.oauthVerifier` are automatically prefixed with `__Host-` when
`NODE_ENV === "production"`. All cookies are now set through shared helpers (`utils/cookies.ts`) that force
`httpOnly`, `secure`, `sameSite: "lax"`, and `path: "/"` (and no `Domain`), satisfying the `__Host-`
requirements. The extension checks both possible cookie names.

### 7. Strict environment validation at startup

`config/env.ts` now fails fast on bad configuration:
- `PORT` must be a positive integer;
- `SESSION_SECRET` ≥ 32 chars;
- `TOKEN_ENCRYPTION_KEY` must decode to 32 bytes (base64);
- `SESSION_EXPIRES_IN_SECONDS` > 0, `SESSION_ROTATION_INTERVAL_SECONDS` ≥ 0, `SESSION_ROTATION_GRACE_SECONDS` ≥ 0;
- `GOOGLE_TOKEN_REFRESH_THRESHOLD` > 0;
- `APP_ORIGINS` entries must parse as URLs;
- in production, `GOOGLE_REDIRECT_URL` must be HTTPS;
- `TRUST_PROXY` and all job intervals validated as non-negative/positive integers.

## P1 — Medium priority

### 8. Google identity bound to `sub` / `googleId` (unique)

`users` upsert now matches on `googleId` (the stable Google subject) instead of `email`. A unique partial index on
`googleId` is created in `init.indexs.ts`. `email` remains a unique index and is treated purely as an account
attribute. A legacy fallback merges by email only when the `googleId` row does not exist.

### 9. Email normalization

`utils/normalize-email.ts` (`trim().toLowerCase()`) is applied on every users/google-accounts write path
(`auth.service`, `auth.repository`, `google-account.repository`).

### 10. Global session revocation

- Server: `POST /auth/logout-all` (auth + CSRF) revokes all sessions for the user and clears the cookie.
- Extension: "Sign out everywhere" button in Settings.

### 11. Rate limiting improvements

- Google account endpoints use composite `IP : userId` rate-limit keys instead of IP alone.
- `/google/login` tightened from 30/min to 10 per 10 min.
- `/google-accounts/refresh` lowered from 50/min to 10/min (it already only re-issues tokens when the stored one is
  near-expiry, so it is effectively idempotent from the client's perspective).

### 12. Request body limits

`express.json({ limit: "10kb" })`.

### 13. Security / audit logging

New `utils/security-log.ts` emits structured JSON events covering: OAuth login success/failure, state mismatch,
session created/rotated/revoked/revoked-all/expired/invalid, IP and user-agent changes, CSRF failures, invalid ID
tokens, Google account connect/disconnect, and token-refresh failures. Sensitive keys (tokens, secrets) are
stripped from the metadata.

## P2 — Production hardening

### 14. Session management UI

- Server: `GET /auth/sessions`, `DELETE /auth/sessions/:sessionId` (auth + CSRF, cannot revoke the current session
  this way).
- Extension Settings now lists sessions (device/user-agent, IP, last-seen, expiry, "Current" badge) with per-session
  revoke and a "Sign out everywhere" action.

### 15. Session / IP retention policy

New `jobs/session-cleanup.job.ts` (registered in `jobs/index.ts`) deletes expired sessions after 90 days
(`SESSION_RETENTION_DAYS`) and revoked sessions after the same window; `expiresAt` already has a TTL index.
`.env.example` documents the new knobs (`SESSION_CLEANUP_INTERVAL_MS`, `SESSION_RETENTION_DAYS`).

### 16. Anomaly detection

During `validateSession()`, a security event is written when a session is used from a different `ipAddress` or
`userAgent` than recorded. It is logged (not yet blocking) to avoid false positives.

### 17. Centralized CSRF coverage for state-changing routes

Every mutating authenticated route now goes through `requireCsrf`: `POST /auth/logout`, `POST /auth/logout-all`,
`DELETE /auth/sessions/:sessionId`, `POST /google-accounts/refresh`, `DELETE /google-accounts`. New mutating routes
must include `requireCsrf` to make state changes.

---

## Additional hardening applied (items from the audit not in the shortlist)

- **Don't leak OAuth error strings** — `auth.validation.ts` returns the generic "OAuth authentication failed"
  message; provider errors only show up in server logs.
- **Validate OAuth callback params** — `code` capped at 4096 chars, `state` at 256.
- **Reject malformed Bearer tokens** — `auth.middleware.ts` requires the `Bearer ` prefix and
  `session.service.ts` validates token shape (`isWellFormedToken`: base64url, 43–256 chars) before any hash/query.
- **Generic client auth errors** — session failures return "Authentication required" to clients while detailed reason
  codes (`SESSION_INVALID`, `SESSION_REVOKED`, `SESSION_EXPIRED`, `SESSION_ROTATED`) remain in the response `code`
  field and server logs.
- **HTTPS enforcement** — in production, non-secure requests are rejected (403) and `TRUST_PROXY` is only enabled
  when set explicitly (defaults to 0 outside production to prevent IP spoofing).
- **Token storage in the extension** — the session token and CSRF token moved from `chrome.storage.local` (persisted
  to disk) to `chrome.storage.session` (in-memory, cleared when the browser restarts). Bearer is still used because
  the extension popup is cross-site to the localhost API; keeping the token only in memory is the approved middle
  ground from the audit.

---

## New / changed files

Server:
- `src/config/env.ts` — strict validation, `__Host-` prefixing, extension allowlist, retention/trust-proxy config
- `src/app.ts` — body limit, HTTPS enforcement, dynamic trust proxy
- `src/middleware/auth.middleware.ts` — token validation, rotation + CSRF sync
- `src/middleware/csrf.middleware.ts` — strict origin allowlist, failure logging
- `src/modules/session/session.{service,repository}.ts` — atomic rotation, global/specific revocation, listings
- `src/modules/auth/*` — PKCE, ID-token verification, generic errors, sessions endpoints
- `src/modules/google-accounts/*` — per-user rate limits, email normalization, refresh-failure logging
- `src/database/init.indexs.ts` — unique `googleId`, session listing index
- `src/jobs/session-cleanup.job.ts` (new), `src/jobs/index.ts` — session retention
- `src/utils/{cookies,pkce,google-jwt,normalize-email,security-log}.ts` (new)
- `.env.example` — documents every new variable

Extension:
- `src/shared/constants/api.ts` — both cookie names
- `src/shared/utils/apiRequest.ts` — in-memory storage, CSRF header sync
- `src/shared/utils/storage.ts` (new) — session-storage helper
- `src/background/index.ts` — both cookie names, session storage
- `src/features/auth/api/index.ts` — session storage
- `src/features/settings/*` — session management UI + `SessionsResponse`/`SessionInfo` types

## Operational notes for deployment

1. Add `CHROME_EXTENSION_ID=<your-extension-id>` (comma-separated) — required before CSRF from the extension works.
2. Add `VERIFIER_COOKIE_NAME` to your environment (e.g. `mail_tracker_oauth_verifier`).
3. In production set `NODE_ENV=production`, use HTTPS, and set `TRUST_PROXY=1` (or your proxy hop count).
4. Existing `users` documents are merged onto `googleId` automatically on next login; the runtime `users.googleId`
   unique index will be created by `initializeIndexes()`.
5. The session token is now re-issued (rotated) atomically; clients that fail a random request during a rotation race
   simply retry — the middleware returns the replacement token/cookie on the very next request.