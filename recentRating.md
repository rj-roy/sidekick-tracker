# Recent Module Rating (out of 30)

Scoring counts **only integrated** work. 10 points per module = 30 total.
Auth and google-accounts are the two integrated modules; the server as a whole
is held down by the missing session module + jobs.

## Auth module — 8/10

| Area | Integrated | Pts |
|------|-----------|-----|
| Fixes 1–10 (OAuth error param, verified-email gate, status mapping, runtime guards, env cookie flags, `ensureDB`+`findById`, asyncHandler) | ✅ all in code | 3 |
| Refresh/access token capture → google-accounts persistence | ✅ wired in callback | 2 |
| Rate limit login + callback (30/min, 10/10min) | ✅ `auth.routes.ts` | 2 |
| Session handoff B (state→`{random,deviceId}`, `createSession`, session cookie) | ❌ not built (needs session) | 0 |
| `/me` + `/logout` | ❌ not built (session-owned) | 0 |
| **Deduction** | | −1 |

*(minus for: `state` still plain uuid, no CSRF guard, no device payload yet)*

## Google-accounts module — 8/10

| Area | Integrated | Pts |
|------|-----------|-----|
| Encrypted token storage (`google_accounts` + repo + indexes) | ✅ | 2 |
| Field correctness (`expiresAt`, `scopes`, refresh-token preservation, correct key derivation) | ✅ all fixed | 2 |
| Silent token refresh (`getAccessToken` → `/token` → re-upsert) | ✅ `google-oauth.service.ts` | 2 |
| Gmail API (profile / list / get) | ✅ `gmail.service.ts` | 2 |
| HTTP surface (list/disconnect account) | ❌ no `routes.ts` yet | 0 |
| Sync job / email processing | ❌ (planned `jobs/`) | 0 |

## Full server — 3/10

| Area | Integrated | Pts |
|------|-----------|-----|
| Always-on boot, eager DB, graceful shutdown, indexes, de-serverless | ✅ complete | 2 |
| Rate-limit infra (in-memory store + generic factory) | ✅ (2 of 5 rules live) | 1 |
| Session module (`/me`, `/logout`, `requireAuth`, rotation) | ❌ | 0 |
| Background jobs (polling/cleanup/subscription-sync) | ❌ | 0 |
| Remaining modules (mailboxes, tracking, emails, billing, webhooks) | ❌ | 0 |

## Total — 19/30