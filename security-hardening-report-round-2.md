# Security Hardening — Round 2 (audit follow-up)

Date: 2026-09-14

Follow-up to [security-hardening-report.md](./security-hardening-report.md). Here are the remaining recommendations from the round-1 audit and how each was addressed.

## Audit 1: Session rotation — grace window shorten to 5-15s

A long grace period means a stolen old token remains usable for a long time after rotation. Shortened the default grace window from 600s to **15 seconds**.

- `sidekick-server/src/config/env.ts` — `SESSION_ROTATION_GRACE_SECONDS` default changed `600` → `15`.
- `sidekick-server/.env.example` — documented (note says keep it 5-30s).
- `sidekick-server/.env` — dev now sets `SESSION_ROTATION_GRACE_SECONDS=15`.

## Audit 2: Expired-check must run before the "rotated but still in grace" check

Previously a session that had been rotated (`rotatedToHash` set) inside the grace window would pass validation even if `expiresAt` had already passed, because the rotation check came first. Corrected the order in `SessionService.validateSession`:

1. not found → `SESSION_NOT_FOUND`
2. revoked → `SESSION_REVOKED`
3. **expired** → `SESSION_EXPIRED`
4. rotated and past grace → `SESSION_ROTATED`
5. rotate/update + anomaly detection

`sidekick-server/src/modules/session/session.service.ts`

## Audit 3: OAuth `state` comparison must be timing-safe

`state` from the query string was compared with `savedState` from the cookie using a plain `!==`. An attacker probing the cookie value could derive timing information. Replaced with `crypto.timingSafeEqual` (constant-time), guarded by a length check first so unequal lengths short-circuit safely.

`sidekick-server/src/modules/auth/auth.controller.ts`

## Audit 4: Clear OAuth cookies even when the callback fails

Previously `oauthState` / `oauthVerifier` cookies were only cleared on the success path. If Google returned an `error` param, or token exchange failed, the cookies lingered until their 10-minute expiry. The whole callback body is now wrapped and both cookies are cleared:

- on success, just before the response;
- on any thrown error, before re-throwing to the error handler.

`sidekick-server/src/modules/auth/auth.controller.ts`

## Audit 5: Server must be connected to MongoDB before `app.listen`

The old bootstrap called `app.listen` before `connectDB()` and `initializeIndexes()`, so the server could accept traffic while the DB/auth was still warming up. Reordered in `sidekick-server/src/server.ts`:

1. `await connectDB()`
2. `await initializeIndexes()`
3. `startJobs()`
4. `app.listen(...)`

Startup failures now set `process.exitCode` instead of silently serving degraded traffic.

## Audit 6: `SESSION_SECRET` must not be a low-entropy placeholder

Length alone (≥32 chars) doesn't stop a placeholder like `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`. Added a Shannon-entropy check on `SESSION_SECRET` (must be ≥ 3 bits/char), plus a repeated-byte check on `TOKEN_ENCRYPTION_KEY` (base64 → bytes must not be a single repeated byte).

`sidekick-server/src/config/env.ts`

## Audit 7: High-risk anomaly — IP + browser family changed together

Plain IP changes (e.g. mobile switching towers, /Roaming on VPN) cause false positives, so a single-IP change is only logged. The high-risk rule is stricter: the session's **IP address changed AND the browser/OS family is radically different** (e.g. Chrome/Windows → Safari/iOS).

- `sidekick-server/src/utils/ua.ts` (new) — `uaFamily(ua)` → `browser-os` family from the User-Agent string.
- `sidekick-server/src/modules/session/session.service.ts` — `detectAnomaly` is now async:
  - logs `SESSION_IP_CHANGED` and `SESSION_UA_CHANGED` as before;
  - logs `SESSION_HIGH_RISK_ANOMALY` when IP **and** family both changed;
  - if `REVOKE_ON_HIGH_RISK_ANOMALY=true`, revokes the session immediately and rejects with `SESSION_REVOKED`.
- `sidekick-server/src/utils/security-log.ts` — added `SESSION_HIGH_RISK_ANOMALY` to the event union.
- `sidekick-server/src/config/env.ts` + `.env.example` + `.env` — new `REVOKE_ON_HIGH_RISK_ANOMALY` flag, default `false` (log-only, avoids false-positive lockouts; rotate/revoke decisions stay in the user's hands).

## Verification

- `sidekick-server`: `npx tsc --noEmit` and `npm run build` — pass.
- `sidekick-extension`: `npx tsc --noEmit` — pass.
- Config load verified against dev `.env`: grace resolves to `15`, `revokeOnHighRiskAnomaly=false`; a `SESSION_SECRET` of `'a'*32` is rejected with "SESSION_SECRET has insufficient entropy".
- Boot smoke test not run this round (no local `mongod`); startup-order change reviewed statically.

## Notes

- The extension intentionally stores the bearer token in `chrome.storage.session` (non-persistent) and only falls back to `chrome.storage.local` where session storage is unavailable (e.g. older Firefox). This is feature-detected, not accidental.
- Long-running sessions may still rotate over a UI refresh in `sidekick-extension/src`; if you see the server issue a rotation, the extension re-reads the token from `chrome.storage.session`, so the new token is picked up automatically.