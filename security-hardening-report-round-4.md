# Security Hardening — Round 4 (audit follow-up)

Date: 2026-09-14

Follow-up to [security-hardening-report-round-3.md](./security-hardening-report-round-3.md). Addresses the 6 items flagged in the latest audit, plus one bonus fix surfaced during smoke testing.

## 1. CORS allowlist now includes extension origins (`app.ts`)

`cors({ origin: env.appOrigins })` excluded `chrome-extension://<id>` origins, meaning the browser CORS layer rejected the extension's requests before CSRF was ever evaluated.

Fix: `origin` is now a callback that checks both `env.appOrigins` and `env.appExtensions` (mirrors `isTrustedOrigin` used by the CSRF layer). A disallowed origin gets no CORS headers (browser blocks the response); requests with no Origin (curl, same-origin) pass through.

`Access-Control-Expose-Headers` now also includes `x-session-token` alongside `x-csrf-token` so the extension can read rotated credentials from cross-origin responses.

`sidekick-server/src/app.ts`

## 2. Rate limiting is now optionally Redis-backed (`rate-limit.middleware.ts`, `package.json`)

`createRateLimit` previously always used `MemoryStore` (per-process, resets on restart). When running multiple instances behind a load balancer, the brute-force protection was invisible across processes.

New `REDIS_URL` env var: when set, rate-limit state is stored in Redis (`rate-limit-redis` + `node-redis`). The Redis client connects lazily on first rate-limited request with `reconnectStrategy: false` so a bad URL fails fast rather than hanging. When `REDIS_URL` is unset (default), behaviour is identical to before (`MemoryStore`).

Added to `.env.example`:
```
REDIS_URL=            # Required when running behind a load balancer
```

## Bonus: IPv6 rate-limit bypass in `google-account.routes.ts`

`express-rate-limit` v8 threw `ERR_ERL_KEY_GEN_IPV6` because `userAwareKey` concatenated `req.ip` directly. An IPv6 client whose address rotates between ranges can bypass per-IP limits. Fixed by calling the built-in `ipKeyGenerator(req.ip)` helper, which hashes the address.

`sidekick-server/src/modules/google-accounts/google-account.routes.ts`

## 3. `revokeOnHighRiskAnomaly` now defaults to `true`

The previous default `false` meant a stolen session token used from a different device+network was only logged, never revoked. The high-risk rule (IP changed **and** browser/OS family changed) is specific enough that false positives from IP rotation alone are avoided, so automatic revocation is safe.

- `REVOKE_ON_HIGH_RISK_ANOMALY` now defaults to `true` (still overridable to `false` when proxies/VPNs cause frequent cross-family IP changes).
- Updated `sidekick-server/config/env.ts`, `.env.example`, and dev `.env`.

## 4. Automated lockout on repeated OAuth failures (`auth-failure-guard.ts`)

`OAUTH_STATE_MISMATCH` / `INVALID_ID_TOKEN` events were logged but nobody acted on them — no escalating lockout, no IP-level ban beyond the flat per-endpoint rate limit.

New in-memory `AuthFailureGuard` (`sidekick-server/src/utils/auth-failure-guard.ts`):

- Tracks consecutive failures (codes `OAUTH_ERROR` / `INVALID_ID_TOKEN`) per IP within a 10-minute window.
- After **10 failures** → IP is locked out for **30 minutes** (returns 429 `AUTH_LOCKED_OUT`; logs `AUTH_FAILURE_LOCKOUT`).
- Stale entries are pruned by a background interval.
- Hooked into `handleGoogleCallback`: lockout checked before the OAuth flow; failures recorded in the catch handler.

`sidekick-server/src/modules/auth/auth.controller.ts`

## 5. Bearer tokens are now scoped to extension origins (`auth.middleware.ts`, `apiRequest.ts`)

The same raw session token was accepted identically from an HttpOnly cookie (browser) or an `Authorization: Bearer` header (extension). A stolen Bearer token could be replayed from any HTTP client without origin validation.

**Server-side enforcement (`auth.middleware.ts`):**

- `extractToken` now reports whether the token came from a header (`viaBearer`).
- When `viaBearer` is true, `requireAuth` requires the request `Origin` to be in `env.appExtensions`; otherwise returns 403 `SESSION_DENIED_ORIGIN` and logs `SESSION_BEARER_UNTRUSTED_ORIGIN`.
- Cookie-origin requests (browser same-site) are unaffected.

**Rotated token delivered via header (`auth.middleware.ts` + `apiRequest.ts`):**

When a Bearer request triggers session rotation, the old token was only replaced in the HttpOnly cookie — unreachable by the extension. The server now sets a `x-session-token` response header with the new token; the extension reads it in `apiRequest` and persists it to `chrome.storage.session`, preventing logout-after-rotation.

This is a hardening boundary: deeper credential separation (separate token types / scopes / shorter-lived extension tokens) remains a possible architectural follow-up.

## 6. Explicit security headers beyond `helmet()` defaults (`app.ts`)

`helmet()` with no config relied on all defaults. Replaced with explicit configuration:

- **CSP**: `default-src 'none'`, `connect-src 'self'`, `frame-ancestors 'none'` (strict JSON-only policy).
- **CORP**: `same-origin` (prevents cross-origin no-cors embedding of API responses).
- **COOP**: `same-origin`.
- **Referrer-Policy**: `no-referrer`.
- **HSTS**: 180 days + `includeSubDomains` in production only; disabled for local development.
- **Permissions-Policy** (set via a header middleware since helmet v8 removed its built-in option): `camera=(), microphone=(), geolocation=(), browsing-topics=()`.

## Verification

- `sidekick-server`: `npx tsc --noEmit` and `npm run build` — pass.
- `sidekick-extension`: `npx tsc --noEmit` and `vite build` — pass.
- App import smoke test: clean (no `ERR_ERL_KEY_GEN_IPV6` after the `ipKeyGenerator` fix).
- `REDIS_URL` unset at import time → memory store used, no Redis connection attempt.

## Operational notes

- `CHROME_EXTENSION_ID` **must be set** for the extension to authenticate via Bearer; with it empty, the server rejects Bearer requests (no trusted extension). Ensure this is populated in any environment where the extension runs.
- `REDIS_URL` is only required when multiple server processes share rate-limit state behind a load balancer; without it the rate limiter works identically to before (per-process `MemoryStore`).
- The OAuth lockout guard is in-memory; a restart clears all lockout state. This is acceptable because restarts also clear the `MemoryStore` rate-limit counters, and repeated attack patterns will quickly re-trigger the guard.