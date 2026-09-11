# Session Management Plan (Better Auth–style, dedicated module)

Feature-first session management for the SideKick mail-tracker extension. Dedicated `session` module with DB-backed sessions, opaque **hashed** tokens, token **rotation**, and **per-device binding** using full device details.

## Why a dedicated module

- Sessions are an independent concern, will grow daily (device list, revoke-all, device validation).
- `session` depends on nothing internal — takes `userId` as a plain argument.
- `auth` depends on `session`, not the reverse.
- Matches the feature-first, module-per-domain structure of the server.

## Dependency direction

```
auth      ──►  session       (auth imports SessionService for login; session never imports auth)
app.ts    ──►  session.routes (mounted at /auth: /me, /logout)
middleware ──►  session      (requireAuth calls SessionService.validateSession)
```

- **`session` never fetches users itself.** It operates purely on `userId` as a
  plain value. Resolving `userId → user document` is done by `requireAuth` (via the
  auth module's user accessor, e.g. `AuthRepository.findById`).
- **`auth` owns the OAuth handshake** (login/callback/state cookie); **`session`
  owns everything after authentication** (`/me`, `/logout`, device validation,
  rotation).

## Location

```
src/modules/session/
├── session.model.ts        — schema/field definitions
├── session.indexes.ts      — MongoDB index creation
├── session.controller.ts   — HTTP handlers (getCurrentUser /me, logout)
├── session.service.ts      — orchestration: create / validate / rotate / destroy
├── session.repository.ts   — DB layer (sessions collection)
├── session.validation.ts   — request validation
├── session.routes.ts       — router (mounted at /auth: /me, /logout)
└── index.ts                — barrel export (SessionService, types)
```

Middleware lives at `src/middleware/auth.middleware.ts` (`requireAuth`), mounted in
`app.ts` alongside the auth router: `app.use("/auth", authRouter)` + `app.use("/auth", sessionRouter)`.

## `sessions` collection schema

Mirrors the Better Auth session table, extended with rotation + full device binding.

| Field             | Type     | Notes                                              |
|-------------------|----------|----------------------------------------------------|
| `tokenHash`       | string   | SHA-256 of current token. **Unique index.**        |
| `rotationKeyHash` | string   | SHA-256 of rotation key. Used to mint a new token. |
| `userId`          | ObjectId | Owner. Indexed.                                    |
| `device`          | object   | Full device details (see below).                   |
| `ipAddress`       | string   | From request (trust proxy enabled).                |
| `userAgent`       | string   | User-Agent header.                                 |
| `expiresAt`       | Date     | Session expiry.                                    |
| `lastSeenAt`      | Date     | Set on every rotate (≈ once per updateAge window), NOT on every validation. |
| `createdAt`       | Date     | On insert.                                         |
| `updatedAt`       | Date     | On update/rotate.                                  |

### `device` object (full device details, client-supplied)

Captured on login and **validated on every `requireAuth` request**. Sent by the
extension (e.g. `X-Device-Info` header holding a JSON payload).

```ts
interface DeviceInfo {
  deviceId: string;          // stable unique id the client persists
  platform: string;          // e.g. "chrome", "firefox", "android", "ios"
  os: string;                // e.g. "windows", "macos", "linux", "android"
  osVersion?: string;        // e.g. "14.0"
  browser?: string;          // e.g. "chrome", "edge"
  browserVersion?: string;   // e.g. "120.0"
  deviceType?: string;       // e.g. "desktop", "mobile", "tablet"
  screen?: { width: number; height: number };   // optional
  language?: string;         // e.g. "en-US"
  timezone?: string;         // e.g. "Asia/Kolkata"
  userAgent?: string;        // raw UA string, if provided
  isMobile?: boolean;        // convenience flag
  fingerprints?: Record<string, unknown>;   // reserved for future fingerprinting
}
```

**Validation policy** (strict binding):
- Session is bound to the `deviceId` present at creation.
- On every request, the incoming full device payload's `deviceId` must equal the
  session's bound `deviceId`, else reject with `401`.
- Optional deeper check: if `platform`/`os` are present both sides, compare and flag
  mismatch (configurable severity: `strict` reject vs `warn` log).

### How device info reaches the server at login

The OAuth callback is a top-level browser redirect from Google — custom headers
like `X-Device-Info` do **not** exist on that GET. Device binding is therefore
established as follows:

1. **Login start** (`googleAuthRedirect`): the extension may pass `deviceId` (a
   stable id it persists) as a query param; the server generates one if absent.
   This `deviceId` is embedded **inside the OAuth `state`** and stored alongside
   the state cookie.
   - `state` becomes `{ random: uuid, deviceId?: string }` (or a delimited string).
2. **Callback**: `handleGoogleCallback` extracts `deviceId` from the validated
   `state`, derives `platform`/`os` from the `User-Agent` header, and passes the
   resulting `device` object to `SessionService.createSession`.
3. **Every request after login**: the extension sends the full device payload via
   `X-Device-Info`. Its `deviceId` must match the session's bound `deviceId`. Other
   fingerprint fields are compared/flagged when present.

## Token / rotation design

### Raw (cookie) vs hash (DB) — exact split

| Value                    | Cookie (`RAW_COOKIE_NAME`) | DB (`sessions`)          |
|--------------------------|----------------------------|--------------------------|
| raw `token` (32-byte)    | ✅ (the credential)        | ❌ stores hash only      |
| raw `rotationKey` (32-byte)| ✅ (rotation credential) | ❌ stores hash only      |
| `tokenHash` (SHA-256)    | ❌                         | ✅                       |
| `rotationKeyHash` (SHA-256)| ❌                       | ✅                       |

- Cookie carries **only the two raw secrets** — no user id, device, or expiry
  (all of that lives server-side).
- DB stores **only the hashes** — a leak exposes no usable credentials.
- Validation matches by **hashing the cookie values** and looking up the hashes,
  never by comparing raw values stored in the DB.

### Cookie payload type (browser cookie value)

The `RAW_COOKIE_NAME` HttpOnly cookie holds exactly this — nothing else:

```ts
interface SessionCookiePayload {
  token: string;         // raw 32-byte session token (the credential)
  rotationKey: string;   // raw 32-byte rotation secret
}
```

- Serialized (e.g. base64url JSON) and stored in the cookie. **No** `userId`, `device`,
  `expiresAt`, or any hash — those are server-side only.
- Re-serialized identically on rotation with the fresh raw values.

### Create (login)

Session module:
1. generates raw `token` + raw `rotationKey`,
2. hashes both → `tokenHash`, `rotationKeyHash`,
3. stores **only the hashes** in `sessions` (with `userId`, `device`, `ipAddress`,
   `userAgent`, `expiresAt`, timestamps),
4. returns the **raw** `token` + `rotationKey` to the auth module, which places them
   in the HttpOnly cookie. Raw secrets never touch the DB or the JSON body.

### Validate (`/me` / `requireAuth`)

1. read raw `token` (and `rotationKey`) from the cookie,
2. hash the token → look up `sessions` by `tokenHash`,
3. check expiry + `deviceId` binding (and, if enabled, hash rotation key →
   compare `rotationKeyHash`),
4. session doc yields `userId`. **`requireAuth` (not the session module) resolves the
   user** from `users` via the auth module (e.g. `AuthRepository.findById(userId)`)
   and attaches `req.user` + `req.session`.

### Rotate (sliding refresh, implicit on `/me`)

When the session is **stale** (updateAge threshold crossed):
1. verify current token + `deviceId` match,
2. mint a fresh raw token (+ new rotation key),
3. atomically replace `tokenHash`/`rotationKeyHash`, extend `expiresAt`,
   bump `lastSeenAt`/`updatedAt`,
4. set the refreshed cookie (new raw token + rotation key) on the response.

### Rotation-key-in-cookie leak mitigation

An attacker who steals the cookie gains both the raw token and raw rotation key —
full session takeover if used from the same device. This is inherent to the
opaque-token-in-cookie design (same as Better Auth, most session libraries).
**Mitigations in this plan:**

1. **Device binding** — attacker's request must carry a `X-Device-Info` payload
   whose `deviceId` matches the session's bound `deviceId`. A different device
   immediately triggers `401`. This is the primary mitigation.
2. **Cookie flags** — `HttpOnly` + `Secure` (prod) + `SameSite=Lax` prevent
   casual theft via JS or cross-origin theft. Already in the plan.
3. **Short rotation window** (optional, harder): if `SESSION_ROTATION_WINDOW`
   is set (e.g. `3600` = 1 hour), the server rejects rotation attempts made
   after the window, even with a valid rotation key. This limits the damage
   window of a leaked cookie but adds complexity; **deferred by default.**
4. **Session revocation** (future): `/auth/session/:id` DELETE lets the
   legitimate user revoke stolen sessions. Deferred per scope.

**Bottom line:** the cookie leak is mitigated by device binding + cookie
flags. A stolen cookie from the same browser/device is a full compromise;
from a different device, it's rejected. This is the expected tradeoff of
any cookie-based session system.

## Rate-limit config (session endpoints)

Session endpoints use the **same shared rate-limit utility** as auth:
`createRateLimit({ store, windowMs, max, keyFn })` from
`src/middleware/rate-limit.middleware.ts`.

| Endpoint                     | Limit            | Key          | Notes                     |
|------------------------------|------------------|--------------|---------------------------|
| `GET /auth/me`               | 60 req / min     | userId       | Zero-write unless stale   |
| `POST /auth/logout`          | 20 req / min     | userId       | JSON-only (CSRF guard)    |
| Rotation (implicit in `/me`) | same as `/me`    | userId       | One write per updateAge   |

- `userId` is available **after** session validation; pass it to the
  rate-limit `keyFn` via a small `req.userId` set by `requireAuth` before
  calling `next()`.
- If `UPSTASH_REDIS_REST_URL` is absent (dev/tests), fall back to in-memory
  store (acceptable locally, not on Vercel).

## Session lifetime

| Config            | Default  |
|-------------------|----------|
| `expiresIn`       | 7 days   |
| `updateAge`       | 12 hours |
| sliding refresh   | enabled  |

Sliding rule: if `now - updatedAt >= updateAge`, extend `expiresAt = now + expiresIn`
(and rotate the token).

> **(`freshAge` — not used yet.)** Better Auth also tracks session *freshness*;
> currently no endpoint depends on it, so it is **not implemented**. If a future
> "require fresh session" endpoint needs it, add a `freshAge` config and compare
> against `createdAt`/`lastSeenAt` then.

## Endpoints

| Method | Path             | Auth         | Purpose                                    |
|--------|------------------|--------------|--------------------------------------------|
| GET    | /auth/me         | requireAuth  | Validate session + return user + session.  |
| POST   | /auth/logout     | requireAuth  | Delete session row + clear cookie.         |
| (later)| /auth/session    | requireAuth  | List this user's sessions (devices).       |
| (later)| DELETE /auth/session/:id | requireAuth | Revoke a specific session/device.    |
| (later)| POST /auth/rotate| requireAuth  | Explicit forced rotation (optional).       |

## `requireAuth` middleware behavior (`src/middleware/auth.middleware.ts`)

1. Read `env.cookies.raw` cookie (contains raw token + rotation key).
2. Read full device payload from `X-Device-Info` header.
3. `SessionService.validateSession(token, deviceInfo)`:
   - no cookie / unknown `tokenHash` / expired  → `401 Not authenticated`
   - `deviceId` mismatch → `401` (untrusted device)
   - stale (updateAge crossed) → rotate, attach new token to return
   - otherwise a **pure read** (no `lastSeenAt` write on a non-stale request)
4. Resolve the user from `userId` via the auth module (e.g. `AuthRepository.findById`).
5. Attach `req.user`, `req.session`; if rotated, set the refreshed cookie; `next()`.

**Logout CSRF guard:** `POST /auth/logout` additionally rejects requests that
aren't JSON — require `Content-Type: application/json` and/or presence of
`X-Requested-With: XMLHttpRequest`. Prevents a foreign page from triggering logout.

## Repository notes & race handling

- Reuse the E11000 pattern from `AuthRepository.upsert`:
  - **Create** collision on `tokenHash` (crypto, astronomically unlikely) →
    regenerate token once + retry, else 500.
  - **Rotate** → atomic `findOneAndUpdate` keyed on the **current `tokenHash`**
    (the old token's hash). If it matched nothing, the session was already rotated
    (or revoked) by a concurrent request → return `401` for this request; the client
    retries with the refreshed cookie it holds. Never attempt to re-read by a
    "new token" the request doesn't possess.
- **Write frequency:** `findByTokenHash` is a pure read. `lastSeenAt`/`updatedAt`
  are written only inside `rotate()` (≈ once per `updateAge` window), so a
  non-stale `/me` performs zero DB writes.
- Indexes (in `session.indexes.ts`):
  - `createIndex({ tokenHash: 1 }, { unique: true })`
  - `createIndex({ userId: 1 })`
  - `createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })` — **TTL index**;
    MongoDB auto-deletes expired rows (serverless-friendly, no cron).
  - `createIndex({ "device.deviceId": 1 })`

## Config additions (`src/config/env.ts` + `.env.example`)

- `SESSIONS_COLLECTION` (e.g. `sessions`)
- `SESSION_EXPIRES_IN_SECONDS` (default `604800` = 7d)
- `SESSION_UPDATE_AGE_SECONDS` (default `43200` = 12h)
- `SESSION_DEVICE_HEADER` (default `x-device-info`)
- Cookie names come from the existing `env.cookies`: raw session cookie =
  `env.cookies.raw` (`RAW_COOKIE_NAME` env), OAuth state cookie =
  `env.cookies.oauthState` (`STATE_COOKIE_NAME` env). Use these accessors — do not
  hardcode strings.
- `SESSION_SECRET`: used **only** to HMAC-SHA256 the cookie payload (tamper
  detection). The DB `tokenHash` lookup remains the authority — a signature
  mismatch is treated the same as an invalid token.

> **Serverless note:** `connectDB()` only runs in `server.ts`'s `listen` callback;
> under Vercel it never runs, and `getDB()` throws when not connected. Session repo
> ops must go through a lazy `ensureDB()` (same fix the auth module needs) that
> connects on first use per request.

## Auth integration

**Login start** (`googleAuthRedirect`): accept optional `deviceId` query param,
generate one if absent, build `state = { random, deviceId }`, store it with the
state cookie, and embed the serialized `state` in the Google URL.

In `auth.controller.ts` `handleGoogleCallback`, after the user upsert:
1. Parse `deviceId` + `random` from the validated `state`; derive `platform`/`os`
   from the `User-Agent` header → `device` object.
2. `SessionService.createSession(user._id, device, req)` → raw token + raw rotation key.
3. Set `env.cookies.raw` HttpOnly cookie with the **raw** token + rotation key
   (7d, SameSite=Lax, Secure in prod).
4. `clearCookie(env.cookies.oauthState)`.
5. Return `{ user, session }` — never the raw token/rotation key in the body.

The `/me` and `/logout` handlers live in the **session module**
(`session.controller.ts` / `session.routes.ts`), not in `auth.controller.ts`. The
auth module only owns the OAuth handshake.

## Out of scope (deferred)

- Gmail API / google-account token storage.
- Device-management endpoints (list / revoke-all) — only `/me` + `/logout` now.
- Stateless signed cookie-cache layer (DB-only sessions per decision).
- `state` currently stores `{ random, deviceId }`. If richer client-supplied device
  details (browser, os version, screen) are required at login, extend the state
  payload or the login-start query params — deferred until the extension sends them.

## Verification

### Verified live (before plan)
- ✅ E11000 duplicate-key race handling in auth module — tested against live
  MongoDB Atlas; concurrent upserts resolve gracefully.
- ✅ `npm run typecheck:api` — passes clean after session plan updates.
- ✅ Session plan cross-referenced against `auth.rest.plan.md`
  (dependency direction, `ensureDB()` + `findById` gap, rotation race, rate-limit
  util ownership) — all consistent.

### To verify (after execution)
- `npm run typecheck:api` after session module created.
- Login: session row created (only hashes, `device.deviceId` from state, no raw
  token in DB); `deviceId` from state matches session.
- `/me` with correct cookie + `X-Device-Info` → `200 + user + session`.
- `/me` with wrong `deviceId` → `401`.
- `/me` with expired token → `401`.
- Stale session `/me` → rotated cookie, `tokenHash` changed, `lastSeenAt` updated,
  non-stale `/me` performs **zero writes**.
- `POST /auth/logout` without JSON → rejected (CSRF guard).
- `POST /auth/logout` with JSON → session row deleted, cookie cleared, `/me` → `401`.
- TTL index confirmed on `sessions.expiresAt` (expired rows auto-deleted by Mongo).
- Rate-limit: `/auth/me` exceeds 60 req/min → `429`.
