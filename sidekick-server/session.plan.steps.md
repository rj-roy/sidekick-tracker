# Session Integration — Spider-Web Execution Plan

Builds the session module **center-outward**, like a spider spinning its net. Start at the
hub, then throw radials to each outer anchor. Independent radials can be done in parallel
once the hub is in place.

> Phases marked `(ex)` have already been executed.

```
                        ┌─────────────────────────────────┐
              ANCHOR    │  extension/device.ts             │
              (device)  │  → apiRequest.ts → background    │
                        └──────────────┬──────────────────┘
                                       │ X-Device-Info / device_id
   ┌──────────────────┐      ┌─────────┴──────────────────┐
   │ auth.repository  │←─────│  auth handoff               │
   │ .findById (user) │      │  (validation+service+ctrl)  │
   └──────┬───────────┘      └─────────────────────────────┘
          │ findById
   ┌──────┴───────────────────────────────────────────────────────┐
   │                      SESSION MODULE (hub)                    │
   │  types → model → repository → validation → service → routes │
   └──────┬──────────────────────────────────┬───────────────────┘
          │                                  │
   ┌──────┴──────────────────┐    ┌──────────┴────────────────┐
   │  requireAuth middleware  │    │  indexes → init.indexs    │
   │  (auth.middleware.ts)    │    │                            │
   └──────┬──────────────────┘    └──────────┬────────────────┘
          │                                  │
   ┌──────┴──────┐                     ┌─────┴─────────┐
   │   app.ts    │                     │   mongodb.ts  │
   │ (mount)     │                     │               │
   └─────────────┘                     └───────────────┘
```

## Web build order

| Layer | What | Steps |
|-------|------|-------|
| **Ring 0** | Config anchor | Phase 1 `(ex)` |
| **Hub** | Session module (center) | Phase 2 |
| **Radial 1** | → `auth.middleware.ts` (requireAuth) | Phase 3 |
| **Radial 2** | → `session.indexes.ts` + `init.indexs.ts` | Phase 4 |
| **Radial 3** | → auth handoff (`auth.validation/service/controller`) | Phase 5 |
| **Radial 4** | → `app.ts` mount | Phase 6 |
| **Radial 5** | → extension device binding | Phase 7 |
| **Spiral** | Verification (inside → outside) | Checklist |

Radials 1–5 are **independent of each other** (they only depend on the hub being in
place). Do them in any order; you can even jump between radials.

---

## Ring 0 — Config (anchor, already set)

### Phase 0 `(ex)` — Preflight

| 0.1 | `ensureDB()` exists in `src/database/mongodb.ts` |
|-----|--------------------------------------------------|
| 0.2 | `AuthRepository.findById(id)` exists in `src/modules/auth/auth.repository.ts` |
| 0.3 | `createRateLimit` + `rateLimitStore` exist |
| 0.4 | `npx tsc --noEmit` passes |

### Phase 1 `(ex)` — Config additions

`env.ts`: added `collections.sessions`, `session.expiresInSeconds` (7d),
`session.updateAgeSeconds` (12h), `session.deviceHeader` (`x-device-info`).
`.env` + `.env.example` updated.

---

## Hub — Session module (the center)

**All hub files live in `sidekick-server/src/modules/session/`.**
Build them in dependency order (each file depends only on files built before it).

### Phase 2 — Hub files

#### Step 2.1 — `session.types.ts`

```ts
import type { ObjectId, WithId } from "mongodb";

export interface DeviceInfo {
  deviceId: string;
  platform: string;
  os: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  deviceType?: string;
  screen?: { width: number; height: number };
  language?: string;
  timezone?: string;
  userAgent?: string;
  isMobile?: boolean;
  fingerprints?: Record<string, unknown>;
}

export interface SessionCookiePayload {
  token: string;
  rotationKey: string;
}

export interface SessionDoc {
  tokenHash: string;
  rotationKeyHash: string;
  userId: ObjectId;
  device: DeviceInfo;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Step 2.2 — `session.model.ts`

```ts
import { env } from "../../config/env.js";

export const SESSION_FIELDS = {
  tokenHash: "tokenHash",
  rotationKeyHash: "rotationKeyHash",
  userId: "userId",
  device: "device",
  ipAddress: "ipAddress",
  userAgent: "userAgent",
  expiresAt: "expiresAt",
  lastSeenAt: "lastSeenAt",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;

export const sessionCollectionName = () => env.mongodb.collections.sessions;
```

#### Step 2.3 — `session.repository.ts`

Raw mongodb driver, `ensureDB()`:

```ts
const collection = async () => {
  const db = await ensureDB();
  return db.collection(env.mongodb.collections.sessions);
};
```

| Method | Behavior |
|--------|----------|
| `create(doc)` | `insertOne(doc)`. E11000 → `ApiError(500, "Session collision", "SESSION_COLLISION")` |
| `findByTokenHash(tokenHash)` | `findOne({ tokenHash })` — pure read, no writes |
| `rotate(currentTokenHash, next)` | Atomic `findOneAndUpdate` keyed on old hash. `null` → concurrent rotation → `401` |
| `destroyByTokenHash(tokenHash)` | `deleteOne({ tokenHash })` |

#### Step 2.4 — `session.validation.ts`

`parseDeviceInfo(raw): DeviceInfo` — accepts JSON string or object. Require `deviceId`
(non-empty string). Cap string fields ~200 chars. Throw `ApiError(400, ...)` on malformed.

#### Step 2.5 — `session.service.ts`

| Helper | Implementation |
|--------|----------------|
| `hash(value)` | `createHash("sha256").update(value).digest("hex")` |
| `generateSecrets()` | `{ token, rotationKey }` = `randomBytes(32).toString("base64url")` each |
| `createSession(userId, device, req)` | Store **only hashes** + metadata. Return `{ token, rotationKey, session }`. Retry once on `SESSION_COLLISION`. |
| `validateSession(cookiePayload, device)` | Hash → lookup → check expiry + `deviceId`. Stale → `rotate()` with fresh secrets; `null` → `401`. Return `{ session, rotated, newToken?, newRotationKey? }`. Non-stale = **zero DB writes**. |
| `destroySession(cookiePayload)` | `destroyByTokenHash(hash(token))` |
| `serializeCookiePayload` / `parseCookieValue` | `base64url(JSON) + "." + HMAC-SHA256(SESSION_SECRET)`. Parse/signature failure → `null` |
| `setSessionCookie(res, token, rotationKey)` | `res.cookie(env.cookies.raw, ..., { httpOnly, secure: prod, sameSite: "lax", maxAge: expiresIn*1000 })` |
| `clearSessionCookie(res)` | `res.clearCookie(env.cookies.raw)` |

#### Step 2.6 — `session.controller.ts`

| Handler | Implementation |
|---------|----------------|
| `getCurrentUser(req, res)` | `req.user` + `req.session` (set by `requireAuth`) → `ApiResponse.success(res, "Authenticated", { user, session })` |
| `logout(req, res)` | `destroySession(req.sessionRaw)` → `clearSessionCookie(res)` → `ApiResponse.success(res, "Logged out")` |

#### Step 2.7 — `session.routes.ts`

`requireAuth` first (sets `req.userId` for rate-limit keyFn):

```ts
router.get("/me",
  requireAuth,
  createRateLimit({ store: rateLimitStore, windowMs: 60_000, max: 60, keyFn: (r) => r.userId }),
  asyncHandler(SessionController.getCurrentUser)
);

router.post("/logout",
  requireAuth,
  logoutCsrfGuard,  // 403 unless JSON or XHR
  createRateLimit({ store: rateLimitStore, windowMs: 60_000, max: 20, keyFn: (r) => r.userId }),
  asyncHandler(SessionController.logout)
);
```

`logoutCsrfGuard`: pass only if `req.is("application/json")` or
`req.get("X-Requested-With") === "XMLHttpRequest"`, else `ApiError(403, "Invalid request", "CSRF")`.

#### Step 2.8 — `index.ts` barrel

```ts
export { SessionService } from "./session.service.js";
export { default as sessionRouter } from "./session.routes.js";
export type { SessionDoc, SessionCookiePayload, DeviceInfo } from "./session.types.js";
```

### Hub verify

`npx tsc --noEmit` — the hub is self-contained. Imports from middleware/routes will
reference `requireAuth` (not yet built); use a placeholder export if needed or build
Radial 1 immediately after.

---

## Radial 1 — `requireAuth` middleware → auth anchor

**File:** `sidekick-server/src/middleware/auth.middleware.ts`

### Step 3.1 — Write the middleware

1. `env.cookies.raw` cookie → `parseCookieValue(value)` → `null` → `401 Not authenticated`
2. `parseDeviceInfo(req.get(env.session.deviceHeader))` → missing/invalid → `401`
3. `SessionService.validateSession(cookiePayload, device)` → throws `401` on bad/expired/mismatch
4. If rotated → `setSessionCookie(res, newToken, newRotationKey)`
5. `AuthRepository.findById(session.userId)` (import repo directly) → no user → `401`
6. Attach `req.user`, `req.session`, `req.userId`, `req.sessionRaw`; `next()`

### Step 3.2 — Augment `Express.Request`

Create `src/types/express.d.ts`:

```ts
import type { WithId } from "mongodb";
import type { SessionCookiePayload, SessionDoc } from "../modules/session/session.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: WithId<Record<string, unknown>>;
      session?: SessionDoc;
      userId?: string;
      sessionRaw?: SessionCookiePayload;
    }
  }
}
```

### Step 3.3 — Error wrapping

`validateSession` is async. Export `requireAuth` wrapped in `try/catch → next(e)`.

### Radial 1 verify

`npx tsc --noEmit` — clean now that hub + requireAuth coexist.

---

## Radial 2 — DB indexes → mongodb anchor

### Step 4.1 — `src/modules/session/session.indexes.ts`

```ts
export async function createSessionIndexes(db: Db): Promise<void> {
  const sessions = db.collection(env.mongodb.collections.sessions);
  await Promise.all([
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ userId: 1 }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }), // TTL
    sessions.createIndex({ "device.deviceId": 1 }),
  ]);
}
```

### Step 4.2 — `src/database/init.indexs.ts`

Call `createSessionIndexes(db)` in the `Promise.all`.

### Radial 2 verify

Restart → log shows indexes. `mongosh` → `db.sessions.getIndexes()` confirms TTL + unique.

---

## Radial 3 — Auth handoff → auth anchor

### Step 5.1 — `src/modules/auth/auth.validation.ts`

`state` → `{ random, deviceId }`:

| Helper | Behavior |
|--------|----------|
| `serializeState(deviceId?)` | `{ random: crypto.randomUUID(), deviceId }` → serialized |
| `parseState(state)` | Decode + parse + validate; `ApiError(400, "Invalid or expired OAuth state")` on failure |
| `validateLoginCallback(query)` | Keeps `error`/`code` handling; returns `state` as the parsed object |

### Step 5.2 — `src/modules/auth/auth.service.ts`

- `getGoogleAuthUrl(state)` stays (now receives serialized state)
- Add `deriveDeviceFromRequest(req, deviceId)` → `DeviceInfo` from User-Agent header (light regex for os/browser, else `"unknown"`)

### Step 5.3 — `src/modules/auth/auth.controller.ts`

- `googleAuthRedirect`: read optional `device_id` query param → `serializeState(deviceId)` → `getGoogleAuthUrl(serialized)`
- `handleGoogleCallback` — after user upsert + token storage:

```ts
const { deviceId } = state;
const device = AuthService.deriveDeviceFromRequest(req, deviceId);
const { token, rotationKey } = await SessionService.createSession(user._id, device, req);
SessionService.setSessionCookie(res, token, rotationKey);
res.clearCookie(env.cookies.oauthState);
```

Return `{ user, session }` — **never** the raw token/rotation key in the body.

### Step 5.4 — `src/modules/auth/auth.routes.ts`

Leave `/me` and `/logout` **commented out** (session router owns them).

### Radial 3 verify

Full login flow: sets `mail_tracker_session` cookie, returns `{ user, session }`.
DB row has only hashes + `device.deviceId` from state.

---

## Radial 4 — `app.ts` mount

### Step 6.1 — `src/app.ts`

```ts
import { sessionRouter } from "./modules/session/index.js";
app.use("/auth", authRouter);
app.use("/auth", sessionRouter);
```

### Radial 4 verify

- `curl /auth/me` (no cookie) → `401`
- `curl -X POST /auth/logout` (no JSON) → `403`

---

## Radial 5 — Extension device binding

### Step 7.1 — New util `sidekick-extension/src/shared/utils/device.ts`

| Export | Behavior |
|--------|----------|
| `getOrCreateDeviceId()` | `chrome.storage.local["deviceId"]`; absent → `crypto.randomUUID()` + persist |
| `buildDeviceInfo()` | `{ deviceId, platform: "chrome", os, browser, browserVersion, language, timezone, screen, userAgent, isMobile }` |

### Step 7.2 — `src/shared/utils/apiRequest.ts`

```ts
const deviceInfo = await buildDeviceInfo().catch(() => null);
const headers = { "Content-Type": "application/json" };
if (deviceInfo) headers["X-Device-Info"] = JSON.stringify(deviceInfo);
```

### Step 7.3 — `src/background/index.ts`

```ts
const deviceId = await getOrCreateDeviceId();
chrome.tabs.create({
  url: `${API_BASE_URL}/auth/google/login?device_id=${deviceId}`,
  active: true,
});
```

### Step 7.4 — `src/features/auth/api/index.ts` (optional)

Cache `me()` in `chrome.storage.local["authUser"]`; on 401 clear it.

### Radial 5 verify

- Login URL contains `device_id=<uuid>`
- After login, popup → Dashboard (`/me` → `200`)
- Wrong device → `/me` → `401 Untrusted device`

---

## Spiral — Verification (inside → outside)

Test at increasing radius from the hub:

| Radius | Test |
|--------|------|
| Hub | `npx tsc --noEmit` passes |
| Hub | Login → `sessions` row has **only hashes** + correct `device.deviceId` |
| Radial 1 | `/me` with correct cookie + `X-Device-Info` → `200` + user + session |
| Radial 1 | `/me` with wrong `deviceId` → `401` |
| Radial 1 | `/me` with expired token → `401` |
| Radial 1 | Stale session `/me` → rotated Set-Cookie, `tokenHash` changed, `lastSeenAt` bumped |
| Radial 1 | Non-stale `/me` → **zero writes** |
| Radial 4 | `POST /auth/logout` without JSON → `403` (CSRF guard) |
| Radial 4 | `POST /auth/logout` with JSON → session deleted, cookie cleared, `/me` → `401` |
| Radial 2 | TTL index on `sessions.expiresAt` (auto-deleted by Mongo) |
| Radial 1 | `/me` bursts past 60 req/min → `429` |
| Radial 5 | Extension `device_id` in login URL + `X-Device-Info` on all API requests |

> **Gotcha — CORS:** popup origin is `chrome-extension://<id>`. Add it to `APP_ORIGINS`
> if `/me` fails with CORS. Same for `credentials: "include"` needing matching origin.

---

## Dependency direction (spider reference)

```
auth ───────────────► session        (auth.controller calls SessionService.createSession)
app.ts ─────────────► session.routes (mounted at /auth: /me, /logout)
middleware ─────────► session        (requireAuth calls SessionService.validateSession)
middleware ─────────► auth           (requireAuth resolves user via AuthRepository.findById)
session ────────────► (nothing)      — takes userId as a plain value (the hub stands alone)
```