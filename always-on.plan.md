# Always-On Hosting Plan (de-serverless)

Move the SideKick server off Vercel serverless to an **always-on** instance
(Railway / Render / DigitalOcean Droplet). This is the *decision* recorded on
`2026-09-07`; this file is the executable checklist so the change can be applied
in one pass later.

## Why (recorded decision)

- Background Gmail/mailbox polling is core to the product and needs a scheduler
  a serverless function cannot run; always-on makes it a `setInterval`/cron job.
- The serverless-only workarounds vanish: `ensureDB()` back to eager connect,
  Upstash Redis dep dropped for in-memory rate limit, no keep-alive alarms.
- Express is built for persistent processes; cold starts on `/me` gone.
- At expected scale one small instance beats serverless cost + complexity.

## What does NOT change (already correct either way)

- Auth fixes 1–10 (`auth.rest.plan.md`) — stack-agnostic.
- Session module (`session.plan.md`) — DB-backed hashed sessions, rotation,
  device binding all remain.
- Cache-first `/me` in the extension — keep it; it's about UX, not cold starts.
- API shapes, cookie flags, OAuth flow — unchanged.

## Steps

### 1. Boot path — eager DB connection (revert laziness)

**`src/server.ts`** — already connects eagerly in the `listen` callback
(lines 10–18). Keep. Optionally log Mongo host on success.

**`src/database/mongodb.ts`** — `ensureDB()` stays (harmless fallback), but
primary path is the eager `connectDB()` from boot. No change required; just
confirm the `listen` callback runs on the new host (it will).

### 2. Rate limiting — drop Upstash, use in-memory store

**`src/config/rate-limit.ts`** — remove the Upstash branch + `@upstash/redis`
import; export only the in-memory store. No behavior change to callers.

**`package.json`** — `npm uninstall @upstash/redis`.

**`src/middleware/rate-limit.middleware.ts`** — unchanged (still reads
`rateLimitStore`). The shared `createRateLimit` util stays.

Rate limits stay the same (login 30/min, callback 10/10min, /me 60/min/user,
logout 20/min/user — the /me + /logout rules land with the session module).

### 3. Session module — implement per `session.plan.md`

Not started yet; build it exactly as planned. The `requireAuth` middleware,
`/me`, `/logout`, rotation, and `X-Device-Info` device binding are all
always-on-compatible. Apply rate-limit rules via the in-memory store.

### 4. Background jobs — mailbox polling

New `src/jobs/` (or `src/workers/`) once mailboxes exist:
- `setInterval`/cron running while the process is alive (in `server.ts` boot).
- Gmail refresh-token flow (tokens captured in Fix 3; encryption at rest is the
  `utils/crypto.ts` deferred item from `auth.rest.plan.md`).
- No Vercel Cron / external scheduler needed.

### 5. Boot mount order

`server.ts` boot sequence after this:
```
listen → connectDB() → initializeIndexes() → start jobs → log "listening"
```

### 6. Deployment plumbing

- **Remove/replace Vercel artifacts**: `api/index.ts`, `vercel.json`,
  `@vercel/node` devDependency (npm uninstall), `dist/` build output.
- **Host config** (pick one):
  - Railway/Render: build command `npm run build`, start `npm start`
    (`node dist/server.js`).
  - Droplet: same build, run via `pm2` or systemd; put behind Caddy/Nginx for
    TLS; `PORT` from env.
- **Env vars to set on host** (unchanged set): `MONGODB_URI`, `MONGODB_DB_NAME`,
  `USER_COLLECTION`, `TRACKED_EMAILS_COLL`, `OPEN_EMAIL_COLL`, `RAW_COOKIE_NAME`,
  `STATE_COOKIE_NAME`, `GOOGLE_*`, `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`,
  `APP_ORIGINS`, `NODE_ENV=production`, `PORT`.
- **Skip**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (no longer read).

### 7. Extension — drop the keep-alive alarm idea

**`manifest.json`** — do NOT add `"alarms"` permission (currently only
`storage`, `tabs`). No background keepalive pings.

**`src/background/index.ts`** — no alarm registration; keep only the
`OPEN_SIGN_IN` chrome.tabs.create wiring.

**`src/features/auth/api/index.ts`** — keep `me()` cache-first pattern:
cache `{ user, fetchedAt }` in `chrome.storage.local`, render instantly,
reconcile via `/me` in the background. This stays regardless of hosting.

## Verification checklist

- [ ] `npm uninstall @upstash/redis @vercel/node`
- [ ] `npm run typecheck:api` clean after removing Upstash imports
- [ ] `npm run build` + `npm start` boots → "SideKick server listening"
- [ ] `/api/health` returns `{ status: "ok" }`
- [ ] Google login → callback → cookie set → `/me` returns user (session module)
- [ ] Rate-limit still 429s after burst (in-memory store now works)
- [ ] Jobs start on boot (once mailboxes implemented)
- [ ] Vercel artifacts (`api/`, `vercel.json`) removed

## Files touched

| File | Change |
|------|--------|
| `src/config/rate-limit.ts` | remove Upstash branch, in-memory only |
| `src/server.ts` | add job-start to boot; keep eager connect |
| `api/index.ts`, `vercel.json` | delete |
| `package.json` | drop `@upstash/redis`, `@vercel/node` |
| `src/modules/session/**` | build per `session.plan.md` (unchanged design) |
| `manifest.json`, `src/background/index.ts` | nothing extra (no alarms) |