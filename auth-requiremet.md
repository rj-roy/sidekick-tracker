# Auth Requirements — Google OAuth Registration (Start to End)

## Overview

Server-led Google OAuth for the SideKick mail tracker extension. The server owns the entire OAuth handshake, issues an HttpOnly signed session cookie, and stores provider tokens encrypted at rest.

- Session cookie: `RAW_COOKIE_NAME` (signed with `SESSION_SECRET`)
- OAuth state cookie: `STATE_COOKIE_NAME` (short-lived CSRF guard)
- Token storage: AES-256-GCM using `TOKEN_ENCRYPTION_KEY`
- All URLs/credentials sourced from `src/config/env.ts` (`google.*`)

## Flow diagram

```
┌─────────┐   1   ┌──────────────┐   2   ┌────────┐   3   ┌──────────────────┐
│ Gmail    │ ───▶ │ Extension     │ ───▶ │ Server │ ───▶ │ Google consent   │
│ extension │      │ popup/background │      │ (app)  │      │ screen (accounts) │
└─────────┘       └──────────────┘      └────────┘     └─────────┬────────┘
                                                                 │ 4 callback ?code+state
                                                                 ▼
                                                  6 profile ◀── 5 token exchange
                                                                 │
                                                                 ▼
                                                  7 MongoDB: users + mailboxes
                                                    (tokens AES-256-GCM encrypted)
                                                                 │ 8 session cookie + redirect
                                                                 ▼
                                                  9 /api/auth/me → popup logged in
```

## Endpoints

| Method | Path                        | Auth        | Purpose                         |
|--------|-----------------------------|-------------|---------------------------------|
| GET    | /api/auth/me                | session ck  | Session check / user profile    |
| GET    | /api/auth/google/login      | none        | Start OAuth (sets state cookie) |
| GET    | /api/auth/google/callback   | state ck    | Exchange code, register user    |
| POST   | /api/auth/logout            | session ck  | Clear session cookie            |

## Step-by-step

### 1. Popup init → `GET /api/auth/me`
- Sends `RAW_COOKIE_NAME` if present.
- No cookie / expired / invalid signature → `401 { success: false, message: "Not authenticated" }`.
- Popup renders "Sign in with Google" button.

### 2. Sign-in click → `GET /api/auth/google/login`
- Extension background opens a tab: `chrome.tabs.create({ url: "<origin>/api/auth/google/login" })`.
- No auth required.

### 3. Server starts OAuth
- Generate random `state`; store in `STATE_COOKIE_NAME`:
  - HttpOnly, SameSite=Lax, short `maxAge` (~10 min), `Secure` in production.
- Build Google URL from `env.google`:
  ```
  GOOGLE_AUTH_URL?client_id=<GOOGLE_CLIENT_ID>
    &redirect_uri=<GOOGLE_REDIRECT_URI>
    &response_type=code
    &scope=openid email profile https://www.googleapis.com/auth/gmail.modify
    &state=<state>
    &access_type=offline
    &prompt=consent
  ```
- 302 redirect → Google consent screen.

### 4. Google → `GET /api/auth/google/callback?code=...&state=...`
- Validate `state` equals `STATE_COOKIE_NAME` value → else `400` (CSRF guard).
- Clear the state cookie.
- Extract `code`.

### 5. Exchange code → `POST GOOGLE_TOKEN_URL`
- Body (form):
  ```
  code, client_id, client_secret, redirect_uri, grant_type=authorization_code
  ```
- Response: `access_token`, `refresh_token`, `id_token`, `expires_in`.
- `refresh_token` is only returned on **first** consent with `access_type=offline` — this is what makes the initial registration distinct from re-login. Persist it; never re-request.

### 6. Fetch profile → `GET GOOGLE_USERINFO_URL`
- Header: `Authorization: Bearer <access_token>`.
- Response: `sub` (Google ID), `email`, `name`, `picture`.
- `email` must be verified; becomes the unique key on `users.email`.

### 7. Persist (registration core)
- `users`: upsert by `email` — `{ googleId: sub, email, name, avatar }`.
- `mailboxes`: upsert by `googleId` — `{ googleId, email, accessToken, refreshToken, scope, expiresAt }` where `accessToken`/`refreshToken` are **AES-256-GCM encrypted** with `TOKEN_ENCRYPTION_KEY`.
- Never store or log plaintext tokens.

### 8. Create session + redirect
- Sign user payload (HMAC with `SESSION_SECRET`) → set `RAW_COOKIE_NAME`:
  - HttpOnly, SameSite=Lax, `Secure` in production, path `/`.
- 302 redirect → success URL (`?success=1`); dev: `http://localhost:5000`, prod: dashboard origin.

### 9. Back in extension
- Popup calls `GET /api/auth/me` again → `200` with `{ user }` → render "Logged in as <name>" + dashboard.
- Logout: `POST /api/auth/logout` clears `RAW_COOKIE_NAME`.

## Files to create

```
src/integrations/google/google.ts                 — URL builder, token exchange, profile fetch
src/integrations/google/google-oauth.service.ts   — state gen, callback orchestration, session create, mailboxes upsert
src/utils/crypto.ts                               — AES-256-GCM encrypt/decrypt for tokens
src/modules/auth/
  ├── auth.controller.ts   — login / callback / me / logout handlers
  ├── auth.service.ts      — orchestrates steps 3–8
  ├── auth.repository.ts   — users + mailboxes DB operations
  ├── auth.routes.ts       — /api/auth/* router
  └── index.ts
src/middleware/auth.middleware.ts                 — verify RAW_COOKIE_NAME, attach req.user
```

## Security notes

- `redirect_uri` must match the Google Cloud Console exactly (`.env`: `http://localhost:5000/auth/google/callback`).
- `state` cookie prevents OAuth login CSRF.
- Tokens encrypted at rest; never logged; never sent to the extension.
- `refresh_token` only on first consent → treat registration/re-login differently.
- Session cookie is HttpOnly (invisible to JS/extension content scripts) and signed (tamper-proof).
- Vercel gap: `connectDB()` currently only runs inside `server.ts`'s `listen` callback. Serverless never runs it — auth module needs a lazy `ensureDB()` per request.

chrome.runtime.create(server-url/auth/google) > server > google sign in url > get user details mail from google > convert the data using env user_secret_key > send it to frontend > frontend > store the key to cookie > retrive it and login to browser....