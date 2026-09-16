# Security Hardening — Round 3 (audit follow-up)

Date: 2026-09-14

Follow-up to [security-hardening-report-round-2.md](./security-hardening-report-round-2.md). Addresses the 3 items flagged in the latest audit.

## 1. OAuth nonce is now mandatory end-to-end (was: skippable)

The audit found the nonce check could be bypassed: a malformed or missing `n` in the verifier cookie produced `nonce ?? ""`, and `verifyGoogleIdToken(id_token, "")` skipped its check because the guard was `if (expectedNonce && …)`.

Fixes:

- `sidekick-server/src/utils/google-jwt.ts` — `verifyGoogleIdToken` now takes `expectedNonce: string` (required) and rejects with `INVALID_ID_TOKEN` on any mismatch:
  ```ts
  if (claims.nonce !== expectedNonce) { … }
  ```
  A missing `nonce` claim now fails closed instead of being ignored.
- `sidekick-server/src/modules/auth/auth.controller.ts` — the callback fails fast with 400 + `OAUTH_ERROR` when the nonce is absent (logs `OAUTH_LOGIN_FAILURE` with `reason: "missing-nonce"`), and `getCallbackCred(code, verifier, nonce)` is always called with a real string, never `""`.
- `AuthService.getCallbackCred` already declared `nonce: string`; the controller now honors that contract.

Flow now: missing/malformed nonce cookie → reject before token exchange; exchanged ID token → nonce claim must equal the one we issued in the auth URL.

## 2. `googleId` can no longer be silently rebound via email (removed takeover path)

`AuthRepository.upsert` previously fell back to `upsertByEmail`, which did `$set: { googleId: userData.googleId }`. If an email was already bound to a different Google account, that login would reassign the existing account to the new attacker/claimed Google identity.

New behavior (`sidekick-server/src/modules/auth/auth.repository.ts`):

```
upsert by googleId
   ↓
on duplicate-key (11000):
   googleId exists         → return that user
   email exists, same googleId → return that user
   email exists, DIFFERENT googleId → 409 ACCOUNT_EMAIL_CONFLICT (reject)
```

- The automatic `upsertByEmail()` identity-takeover method has been **removed** entirely, so the dangerous path cannot be re-introduced later.
- A login whose verified `email` belongs to a user signed in with a different Google `sub` is now rejected with `409 "An account using this email already exists with a different Google account"`, forcing the user toward an explicit account-linking flow instead of silent takeover.
- Legitimate cases still work: first login (insert), returning user (same googleId → update/return), and same-user-same-email races.

## 3. Extension token handling — audited and hardened

### Audit findings (all good before this round)

| Concern | Status |
| --- | --- |
| Content scripts access the token directly | Content script (`src/content/index.ts`) is inert — a single `console.log`, imports nothing from `storage`/`apiRequest`. |
| Arbitrary extension messages can request the token | The only `onMessage` handler reacts to `OPEN_SIGN_IN_MESSAGE` and opens a tab; no handler returns the token. |
| Only trusted contexts use it | Writes happen only in the background service worker (from the HttpOnly cookie, via `chrome.cookies`); reads happen only in `apiRequest` used by the popup. |
| Exposed via page-accessible storage / DOM | Not exposed to `window`/`document`; token stored in `chrome.storage.session` (default `TRUSTED_CONTEXTS` access level), not web `localStorage`. |
| Manifest | `cookies`/`storage`/`tabs` only; host permission limited to `mail.google.com` + API origin. |

### Hardening added

The session-storage helpers had a silent fallback to `chrome.storage.local` for browsers lacking `chrome.storage.session` (e.g. older Firefox). That would have persisted the raw bearer token to disk.

- `sidekick-extension/src/shared/utils/storage.ts` — `sessionGet`/`sessionSet`/`sessionRemove` now **fail closed** (throw) if `chrome.storage.session` is unavailable, instead of degrading to disk-backed `chrome.storage.local`.
- `sidekick-extension/src/shared/utils/apiRequest.ts` — its token/CSRF `sessionGet`/`sessionSet` helpers fail closed the same way.

The raw bearer token now only ever lives in memory-backed `chrome.storage.session` (cleared on browser restart), never on disk.

## Verification

- `sidekick-server`: `npx tsc --noEmit` and `npm run build` — pass.
- `sidekick-extension`: `npx tsc --noEmit` and `vite build` — pass.
- `grep chrome.storage.local` in extension src: no matches.
- `grep upsertByEmail` in server src: no matches (method removed).

## Remaining considerations (not blockers)

- A 409 (email already bound elsewhere) currently surfaces as a generic error to the user; a dedicated "link accounts" UI/endpoint would be the follow-up if you want explicit linking instead of just rejection.
- `upsertByGoogleId` intentionally does not rewrite the `email` of an existing `googleId` (uses `$setOnInsert`), so a user who changes their Google address keeps the old email on record until an explicit update path is added.