# Sidekick — Build/Bug Audit

Audit date: 2026-10-17. No files were modified during the audit.

## How this was tested

- **Typecheck:** `tsc --noEmit` passes for all three packages (`sidekick-server`, `sidekick-web`, `sidekick-extension`).
- **Lint:** `sidekick-web` eslint → 1 warning (`sidekick-web/src/app/page.tsx:7` unused `isPending`); server and extension have no lint script.
- **Tests:** there is **no test runner or test files in any package** (`sidekick-server`, `sidekick-web`, `sidekick-extension` have no `test` script). So this is a static + runtime-trace audit, not a suite run.
- The full tracking/auth pipelines were traced and two initial exploration claims were corrected (noted inline).

## Features that are actually built

- **Extension → popup:** sign-in, "Track this email" card, compose detection.
- **Pixel creation:** popup → background → content injection → `POST /api/pixel/create` (web) returns a locally-generated token.
- **Send detection:** content `MutationObserver` + click/⌘-Enter capture → `EMAIL_SENT` → `POST /api/tracking/sent` (web) → `POST /tracking/sent` (server, upsert).
- **Open tracking:** recipient `<img>` → `GET /api/track/<token>.gif` (web) → signed `GET /pixel/open/:token` (server) → `recordOpen`.
- **Auth:** Google OAuth (PKCE + id_token nonce verification), encrypted session tokens, rotation, anomaly logs.
- **Not built/wired:** tracked-mail list UI, logout, notifications/polling, Gmail module, `/tracking/create`.

---

## CRITICAL

### C1. Extension content script crashes on startup — all messaging dies
`sidekick-extension/src/feature/email-tracking/content/index.ts:9-18` + `domObserver.ts:29`

The uncommitted `runAt: 'document_start'` (`entrypoints/content/index.ts:14`) runs before the DOM exists, but `initGmailListeners` calls `observer.observe(document.body, …)`:
```ts
// domObserver.ts:29
observer.observe(document.body, { childList: true, subtree: true });
```
`document.body` is `null` at `document_start` → `TypeError` aborts `main` before `browser.runtime.onMessage.addListener` registers (`entrypoints/content/index.ts:19-22`). Every `GET_COMPOSE_STATE` / `INJECT_PIXEL` then times out. The guard flag is set **before** the throw (`:17`), so background re-injection (`autoInject`) also returns immediately and cannot recover — only a full page reload helps.

Note: no built manifest contains `run_at` (checked `.output/**/manifest.json`), so the currently-loaded build predates this change and only **the next `wxt dev/build` breaks the extension.**

### C2. Web first-time sign-in is impossible (session-cookie chicken-and-egg)
`sidekick-web/src/lib/server/signedFetch.ts:13-18`, `app/auth/google/login/route.ts:7`, `app/auth/google/callback/route.ts:26`

`signedFetch` returns early unless **both** session cookies already exist:
```ts
const session = await getCookie("OG_L");
const csrf = await getCookie("T_ls_");
if (!session || !csrf) return { success: false, message: "Authentication Required!" };
```
But `/auth/google/login` and `/auth/google/callback` are exactly what create those cookies (server sets them in `auth.controller.ts:128-131`). On a fresh browser the login call returns `Authentication Required!` → redirect to `/auth/error`; the callback can never run. Only re-login with existing cookies works.

### C3. `forEach(async …)` means OAuth cookies may never be set before redirect
`app/auth/google/login/route.ts:17-19`, `app/auth/google/callback/route.ts:56-58`
```ts
Object.entries(data.states).forEach(async ([name, value]) => {
  await setCookie(name, value, cookieMaxAge);   // not awaited
});
return NextResponse.redirect(data?.url);         // may run first
```
`forEach` ignores the returned promises, so the redirect can be issued before `_ms__i`/`o_bh_h` (and later `OG_L`/`T_ls_`) are written. Classic cause of intermittent "Failed-to-retrive-cookies".

---

## HIGH

### H1. Cookie `maxAge` unit bug (session lives ~7 days instead of 10 min)
`app/auth/google/callback/route.ts:50` + `lib/cookies.ts:14,21`
```ts
const cookieMaxAge = 10 * 60 * 1000;   // 600000 — intended ms
// cookies.ts passes it straight to Next:
cookieStore.set(name, value, { maxAge });  // Next maxAge is SECONDS
```
Session cookies get `Max-Age=600000` seconds (~6.9 days). Login's state cookies use `10*60` (600s) — correct — so the two code paths disagree. Security-relevant (extends session-token lifetime far beyond intent).

### H2. Extension: `storage.sync` failure aborts `markSent`
`entrypoints/background/index.ts:80-86`
```ts
await updateDraftStatus(trackingToken, "sent"); // read-modify-write of storage.sync
await MailApi.markSent({ ... });
```
If the sync quota/8 KB limit rejects, the catch labels it `server-error` and `markSent` is **never called** → email permanently untracked. The write is also a non-serialized read-modify-write.

### H3. `.env.example` cannot boot the server
`sidekick-server/.env.example` vs `src/config/env.ts`
- Missing required `SIGNED_HMAC_SECRET` (`env.ts:213`), `SEC_TOKEN_ENCRYPTION_KEY` (`:187`), `REGISTERED_EXTENSION` (`:159`) → `getRequiredEnv` throws at import.
- `TRUST_PROXY=0` (line 5) is rejected by `positiveInt` (`:24-33`) → `Environment variable TRUST_PROXY must be a positive integer`.
- `GOOGLE_SCOPE=` uses `\` line continuations (lines 36-39) which dotenv does not interpret.
- `REGISTERED_EXTENSION` is required but **never used** in code (dead config).

### H4. `selfOpenGuard` mostly doesn't work
`feature/email-tracking/content/selfOpenGuard.ts:19-29`
Only observes `childList`, not `attributes`; `src` is typically set **after** insertion so `TRACK_SRC.test(img.src)` is false and the guard skips it. Gmail also rewrites remote images through `ci3.googleusercontent.com`, so the `/api/track/` string is not in `src`/`currentSrc`. DocumentFragments aren't swept. Net: the sender's Sent/inbox view can still trigger self-opens.

---

## MEDIUM

### M1. Server `validateSession` token guard is inverted
`sidekick-server/src/modules/session/session.service.ts:159`
```ts
if (!TOKEN_REGEX.test(token) && token.length <= 256) { throw ... }
```
Should be `||` and `>` — rejects only "malformed AND short"; anything over 256 chars passes the guard.

### M2. Session rotation drops `userAgent`/`ipAddress` → anomaly detection dies after 24h
`session.service.ts:25-31` builds the rotated doc without `userAgent`/`ipAddress`; `detectAnomaly` (`:66-110`) only fires when those are defined. So high-risk revocation stops working for the rest of the session's life.

### M3. Every authenticated request requires Google account + may refresh token
`middleware/authenticator.ts:41` → `google-oauth.service.ts:60-103`. Missing/revoked Google account → 404/401 on **logout** and `/auth/get/session`; records without `expiresAt` refresh on every request.

### M4. Client-controlled IP headers beat `req.ip`; multi-hop XFF becomes "unknown"
`middleware/authenticator.ts:27-28`, `modules/auth/auth.controller.ts:40`, `public-tracking.routes.ts:11`. `x-client-ip` (spoofable) takes precedence over `req.ip`; `validateIp` runs `isIP()` on the whole `x-forwarded-for`, so `"1.2.3.4, 10.0.0.1"` fails → IP `"unknown"`, silently disabling IP anomaly detection and the `AuthFailureGuard` lockout (which is also keyed on the spoofable header).

### M5. Rate-limit keying bugs
- `sidekick-server/src/modules/tracking/tracking.routes.ts:17-23` puts `userAwareKey` **before** `authenticator`, so `req.userId` is undefined → every user shares `<ip>:anon`.
- `middleware/rate-limit.middleware.ts:60-94`: when `REDIS_URL` is set there is **no fallback**; a Redis outage makes `next(err)` → HTTP 500 on `/auth/*` and `/tracking/sent`.

### M6. No CORS / helmet despite configuration
`app.ts` has both commented out; `env.appOrigins`/`env.appExtensions` (`env.ts:108-134,206-207`) are validated but never used, and the rotated-token headers (`x-r-session-token`, `x-r-csrf-token`) can't be read cross-origin.

### M7. Extension duplicate-send race
`background/index.ts:72-77`: `await alreadySent(...)` then `inFlightSends.add(...)` — two concurrent `EMAIL_SENT` messages for one token can both pass. Server upserts, but duplicate writes/calls still happen.

### M8. Send detection is locale-brittle and records blocked sends
`content/sentDetector.ts:16-26,68-69` + `selectors.ts:5-6`. `SEND_BUTTON_SELECTOR` matches English `data-tooltip^="Send"`/`aria-label^="Send"`; non-English Gmail records nothing. Clicks are recorded even when Gmail blocks the send (missing attachment/validation), and `flushPendingSends` uses `sentAt: Date.now()` at flush, not click time.

### M9. `pixel/create` never persists the token; `messageId` is dropped
`sidekick-web/src/app/api/pixel/create/route.ts:27-37`: returns a locally-generated token; the persistence call is commented (`:39-64`). The extension sends only `trackingToken` in `markSent`, never `messageId`, so `trackedEmails.messageId` is always absent and no "pending" record exists. Route also checks only `isTrustedExtension`, not auth.

### M10. Firefox background likely breaks
`entrypoints/background/index.ts:12-14` calls `browser.storage.session.setAccessLevel(...)`, unsupported in Firefox; an undefined method throws synchronously before `runtime.onMessage` is registered, killing the background (and `dev:firefox`/`build:firefox` scripts exist).

### M11. Wrong compose can be targeted
`content/editor.ts:22` falls back to `editors[editors.length - 1]`; `content/compose.ts:38-39` falls back to a document-wide subject query. With multiple compose windows open, the pixel can go into the wrong draft.

---

## LOW (selected)

- `sidekick-web/src/app/auth/google/login/route.ts:12` — `` ?message${res.message} `` missing `=` (malformed error URL).
- `sidekick-web/src/app/auth/google/callback/route.ts:38` — `console.log(res)` logs the full response **including `OG_L`/`T_ls_` session tokens**.
- `sidekick-web/src/app/api/track/[id]/route.ts:29` — leftover `console.log(res, "res")`.
- `sidekick-server/src/utils/http/ApiRsponse.ts:12-17` — `error` param/code is discarded, so `SESSION_EXPIRED`/`RATE_LIMIT`/… never reach clients.
- `sidekick-server/src/app.ts:74,31` — `cookieParser()` mounted but `req.cookies` never read; `res.clearCookie` clears a cookie never set (`auth.controller.ts:201,211`); `cookieOptions`/env cookie names dead.
- `sidekick-server` jobs all commented (`server.ts:5,15`); `jobs/cleanup-tracking-events.job.ts:7` calls non-existent `TrackingRepository.deleteOpensBefore` (would not compile if enabled).
- `sidekick-server/src/modules/gmail/*` fully commented yet `GOOGLE_GMAIL_API_URL`/`REVOKE_URL` are required.
- `sidekick-server/src/modules/auth/auth.validation.ts:11` throws **404** for missing params (should be 400).
- `sidekick-web/src/lib/statusHandler.ts:26` spreads a `Headers` instance into the JSON result (serializes as `{}`).
- Dead code: `sidekick-web/src/lib/server/signInternalFetch.ts` (unused; the spec expected the pixel route to use it, but the route uses `externalApiFetch.ts`), `sidekick-web/src/utils/userInfo.ts` (fully commented), `sidekick-web/src/lib/auth/googleAuth.ts` (commented), extension `feature/email-tracking/gmail.ts` (242 lines commented), `REQUEST_HOST_PERMISSIONS`/`CHECK_HOST_PERMISSIONS` handlers (`background/index.ts:107-119`, no senders), `tab-message.ts:9` unused `injected`, `TrackEmailCard.tsx:51-54` unreachable branch, popup `handleLogOut` is `console.log` only, `Dashboard`/Settings/"How it works" inert, `providers/sessionProvider.tsx` unused.
- Typo/quality: `ApiRsponse.ts`, `init.indexs.ts`, `"runnig"`, `"Faild"`, `"rOogle"`.

## Corrections to commonly-held assumptions

- The server `/pixel/open/:token` being behind `verifyClientReq` is **intentional and correct** — it's called by the Next proxy with an HMAC signature, not directly by email clients.
- Web `externalApiFetch` signing the `path` vs server verifying `originalUrl` **matches** for the pixel GET (no query string), so it is not a live bug — only a fragility if a query is ever added.
- The OAuth `state` comparison is **correct** (`auth.validation.ts:14` decrypts `paramsState` before `auth.controller.ts:49-54` compares), though it relies on a shared client HMAC secret rather than a server-side one-time store.

---

## Suggested fix order

1. **C1** revert/defer `document_start` or wait for `document.body` before observing; only set `__sidekickContentStarted` after listeners register.
2. **C2 + C3** use a session-less signer (the already-created `signInternalFetch`) for `/auth/google/login` and `/auth/google/callback`, and `await` cookie writes (not `forEach(async)`).
3. **H1** fix cookie `maxAge` units (seconds) in `callback/route.ts` and `cookies.ts`.
4. **H2/H3** guard `markSent` against `storage.sync` failures; fix `.env.example`.
5. **M1/M2/M5** server session guard, rotation UA/IP, rate-limit key ordering/Redis fallback.
