# Auth Module — Restructure Plan (pre-session dependency)

Fixes the existing `src/modules/auth/` before any session work. Scope is **auth-only**:
the OAuth handshake and user creation. Session issuance is deliberately NOT here — it
moves to the `session` module per `session.plan.md`. This plan makes auth correct,
secure, and production-safe as a standalone login/registration flow.

Author: review of `auth.module` scored **11/20**. This plan targets **~18–19/20**.

---

## Root-cause fixes (in priority order)

### 1(executed). Handle OAuth error parameter + replay (correctness/UX)
Google redirects back with `?error=access_denied` (user declined) or `error=...`.
Currently `validateLoginCallback` only reads `code`/`state` and the flow 400s vaguely.

**`auth.validation.ts`** — extend `validateLoginCallback`:
```ts
export const validateLoginCallback = (query) => {
    const { code, state, error } = query;
    if (typeof error === "string" && error.trim()) {
        throw new ApiError(400, `OAuth error: ${error}`, "OAUTH_ERROR");
    }
    // existing code + state checks unchanged
};
```
Add an optional `code` field to `ApiError` for stable client handling (default empty).
`errorHandler`/`ApiResponse.error` already accepts an optional `error` payload, so the
`code` can bubble through (`ApiResponse.error(res, err.message, err.statusCode, err.code)`).

### 2. Gate on verified email (security)
Requirements doc: "`email` must be verified; becomes the unique key."

**`auth.types.ts`** — add to `GoogleUserInfo`:
```ts
export interface GoogleUserInfo {
    id: string;
    email: string;
    name: string;
    picture?: string;
    verified_email?: boolean;   // Google userinfo v2 returns this
}
```
**`auth.service.ts` `getCallbackCred`** — reject unverified:
```ts
if (!googleUser.verified_email) {
    throw new ApiError(403, "Google email is not verified");
}
```

### 3. Capture + persist refresh token (registration vs re-login)
`refresh_token` is returned only on the **first** consent. It must be captured (and,
per requirements, encrypted later — that is out of scope here, just **captured**).

**`auth.types.ts`** — add to `GoogleTokenResponse`:
```ts
export interface GoogleTokenResponse {
    access_token: string;
    id_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;   // present only on first consent (access_type=offline)
}
```
**`auth.service.ts`** — return it through:
```ts
const { user, tokens } = await getCallbackCred(code);  // controller already has `tokens`
```
Keep the token **in the response** of `getCallbackCred` (currently discarded in
`auth.controller.ts:28`). Actual storage (mailbox/encryption) is deferred; just stop
discarding it.

### 4. Correct error propagation (stop masking server errors as 401)
`getUserInfo` and `exchangeCodeForTokens` throw `401` on any non-OK, which masks
5xx/rate-limit as client-auth errors.

**`auth.service.ts`** — map status to a correct code:
```ts
if (response.status === 401 || response.status === 403) {
    throw new ApiError(401, "Google authorization failed");
}
if (!response.ok) {
    throw new ApiError(502, "Google upstream error");
}
```
Note: `502 Bad Gateway` accurately reflects an upstream provider failure.

### 5. Runtime-validate provider responses (typing honesty)
`response.json() as GoogleTokenResponse` asserts types without checking.

**`auth.service.ts`** — add minimal guards after parse:
```ts
if (!json?.access_token) {
    throw new ApiError(502, "Malformed response from Google");
}
```
Validate `access_token` presence before use in both token-exchange and userinfo paths.

### 6. Cookie flags environment-correct
**`auth.controller.ts`** — replace hardcoded `secure: true` (blocks traffic on dev
`http://localhost`) and the hardcoded `'oauth_state'` string with `env` values:
```ts
const isProd = env.nodeEnv === "production";
res.cookie(env.cookies.oauthState, state, {
    httpOnly: true,
    secure: isProd,          // allow http in dev/tests
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
});
// callback: clearCookie(env.cookies.oauthState); savedState = req.cookies?.[env.cookies.oauthState]
```
This fixes the existing mismatch (`auth.controller.ts:12,23` vs `env.cookies.oauthState`).

### 7. Remove dead / abandoned cookie code
**`auth.controller.ts`** — delete the commented-out `atc_tomn` block. **Keep** the
`tokens` destructure in the handler (`auth.controller.ts:28`) — per Fix 3 the
access/refresh tokens are intentionally captured, not discarded. Storage
(mailbox/encryption) is deferred; the session plan's callback integration uses
these tokens if present.

### 8. Lazy `ensureDB()` (serverless-safe)
`auth.repository.ts:6` `getDB()` throws if not connected; under Vercel `connectDB()`
never runs.

**`src/database/mongodb.ts`** — add:
```ts
export async function ensureDB(): Promise<Db> {
    if (db) return db;
    return connectDB();
}
```
**`auth.repository.ts`** — `const collection = () => ensureDB().then(d => d.collection(...))`
and `await` it in each call. (Same helper the session module will reuse.)

### 8b. Add `AuthRepository.findById` (session-module dependency)
The session plan's `requireAuth` resolves `req.user` via `AuthRepository.findById(userId)`
(`session.plan.md` Dependency direction + `requireAuth`). This must exist in the auth
module **before** session work.

**`auth.repository.ts`** — add:
```ts
async findById(id: ObjectId) {
    return collection().then(c => c.findOne({ _id: id }));
}
```

### 9. Async handler guard (unhandled rejections)
`handleGoogleCallback` is `async` but no middleware catches rejections → thrown
`ApiError`s become unhandled promise rejections.

**`src/utils/async-handler.ts`** (new, tiny):
```ts
export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
```
**`auth.controller.ts`** — wrap `handleGoogleCallback`; routes use it:
```ts
router.get("/google/callback", asyncHandler(AuthController.handleGoogleCallback));
```
The `errorHandler` middleware already normalizes `ApiError` → correct status.

### 10. Rate-limit the auth endpoints

**Problem:** Vercel serverless creates a **new instance per request** — an
in-memory rate-limit map resets on every cold start, giving zero protection
on cold paths. An in-memory store is effectively useless here.

**Store choice:** use **Upstash Redis** (serverless-friendly, free tier,
works on Vercel). `config/rate-limit.ts` reads `UPSTASH_REDIS_REST_URL` +
`UPSTASH_REDIS_REST_TOKEN` from env. If absent, **fall back to in-memory** for
dev/tests — never hard-fail.

**Per-endpoint limits** (per IP unless logged-in per user):

| Endpoint                        | Limit           | Purpose                          |
|---------------------------------|-----------------|----------------------------------|
| `GET /auth/google/login`        | 30 req / min    | Redirect storm guard              |
| `GET /auth/google/callback`     | 10 req / 10 min | Code replay / brute-force guard   |
| `POST /auth/logout`             | 20 req / min    | Logout flood (per-user if session)|
| Session `/auth/me`              | 60 req / min    | Per-user session validation       |
| Session rotation (via `/me`)    | same as `/me`   | Rotation is implicit in `/me`     |

**`src/middleware/rate-limit.middleware.ts`** — generic factory:
```ts
createRateLimit({ store, windowMs, max, keyFn })
```
`keyFn` defaults to IP; pass a `keyFn` that returns `userId` for authed
endpoints. No Redis dep if `UPSTASH_REDIS_REST_URL` is absent — in-memory
fallback for local dev.

**`config/rate-limit.ts`** — Upstash + in-memory dual-path, read from env.

> **Rate-limit scope note:** `POST /auth/logout` and `GET /auth/me` are listed in
> the table above, but the **rate-limit rule definitions for /me and /logout live
> in the session module** (`session.plan.md`). This plan only **builds the shared
> `createRateLimit` utility/store**; applying it to auth's own endpoints
> (login, callback) is done here, while the session module applies the same util
> to its routes. No conflicting limits — session plan numbers match this table.

---

## Files touched

| File | Change |
|------|--------|
| `auth.types.ts` | `verified_email?`, `refresh_token?`, `error` handling types |
| `auth.service.ts` | verified-email gate, correct status mapping, runtime JSON guards, keep `tokens` |
| `auth.controller.ts` | env-cookie flags, `clearCookie`, error-param, remove dead code, wrap async |
| `auth.validation.ts` | handle `error` param (state change → becomes `{random,deviceId}` in session plan) |
| `auth.repository.ts` | adopt `ensureDB()`, add `findById` |
| `database/mongodb.ts` | add `ensureDB()` |
| `utils/async-handler.ts` | new wrapper |
| `config/rate-limit.ts` + `middleware/rate-limit.middleware.ts` | new (shared; applied to login/callback here) |
| `auth.routes.ts` | use `asyncHandler`, mount rate-limit on callback |
| `utils/ApiError.ts` | optional `code` field |

## Out of scope (deferred, by design)
- **Session issuance, `/me`, `/logout`** → `src/modules/session/` (`session.plan.md`).
- Refresh-token **encryption at rest** (`utils/crypto.ts`) + mailboxes → later.
- `requireAuth` middleware → session module.
- **`state` format change** (embedding `deviceId`) → session integration step
  (session plan). This plan keeps `state` as the plain `uuid`; the session step
  reworks it to `{random, deviceId}` in the **same files** (`auth.controller.ts`,
  `auth.validation.ts`, `auth.service.ts`).
- Applying the rate-limit util to `/me` and `/logout` → session module (this plan
  only builds the shared util + applies to login/callback).

## Execution order (to avoid file-edit conflicts)
Both plans touch `auth.controller.ts` / `auth.validation.ts` / `auth.service.ts` /
`auth.routes.ts`. Run them **sequentially, never in parallel**:

1. **Run `auth.rest.plan.md` fully** (fixes 1–10: state stays plain `uuid`,
   error-param, verified-email, tokens captured, correct status codes, cookie
   flags, `ensureDB`, `findById`, asyncHandler, rate-limit util + login/callback).
2. **Run `session.plan.md` session-integration step** which then reworks
   `state → {random, deviceId}`, adds session cookie issuance + `createSession`,
   and mounts the session router.

This ordering leaves no overlapping edits in flight at the same time.

## Verification

### Verified live (before plan)
- ✅ E11000 duplicate-key race in `AuthRepository.upsert` — 3 concurrent upserts
  for the same email, one insert, all 3 return OK, only 1 doc in DB.
- ✅ `npm run typecheck:api` — passes clean after session plan changes.
- ✅ Auth codebase read — all 10 root-cause issues confirmed against actual code.

### To verify (after execution)
- `npm run typecheck:api` after all 10 fixes applied.
- Dev server redirect: hit `/auth/google/login`, confirm state cookie `secure`
  is off in dev, correct `oauth_state`/`RAW_COOKIE_NAME` cookie set.
- Callback `?error=access_denied` → `400 OAuth error: access_denied` with `code`
  field in JSON.
- Callback with invalid `code` + valid `state` → correct `401` from Google.
- Callback with valid `code` + wrong `state` → `400 invalid OAuth state`.
- Unverified Google email → `403 Google email is not verified`.
- Lazy `ensureDB()` path: test script calls `ensureDB()` → connects on first
  call, reuses on second.
- Rate-limit: callback exceeds 10 req/10 min → `429`.