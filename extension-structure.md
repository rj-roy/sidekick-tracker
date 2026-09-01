# SideKick Extension Structure

Google Mail tracking extension — Chrome MV3, React 19 + Vite + Tailwind.
All server communication lives in `src/api/*`; components never call fetch directly. The server routes are not affected by this split — they stay as mapped in `auth-requiremet.md` (`/api/auth/me`, `/api/auth/google/login`, `/api/auth/google/callback`, `/api/auth/logout`).

## Core principle

`App.tsx` is a **thin shell**. All fetch/business logic lives in `api/*`, not in components:

```
components        → render UI only
api/*             → server communication (requests + responses)
background/*      → chrome.* side effects (tab creation, message routing)
pages/*           → full views (Login, Dashboard, Settings)
```

## Full structure

```
sidekick-extension/
├── index.html                        — popup HTML root
├── manifest.json                     — MV3 config (permissions, host_permissions)
├── vite.config.ts                    — multi-entry build (background / content / popup)
├── package.json
├── tsconfig.json
├── src/
│   ├── api/
│   │   ├── client.ts                 — fetch wrapper (BASE_URL, credentials:"include", JSON, error handling)
│   │   ├── auth.api.ts               — me(), login(), logout()  → calls /api/auth/*
│   │   ├── tracking.api.ts           — (later) stats, recent emails, register tracked email
│   │   └── index.ts                  — barrel
│   │
│   ├── background/
│   │   └── index.ts                  — chrome.runtime.onMessage handler → chrome.tabs.create for sign-in
│   │
│   ├── content/
│   │   └── index.ts                  — Gmail DOM injection (later: compose/send interception)
│   │
│   ├── popup/
│   │   ├── main.tsx                  — React entry (mounts <App />)
│   │   ├── App.tsx                   — thin shell → mounts <AuthRouter />
│   │   ├── components/
│   │   │   ├── AuthRouter.tsx        — decides view by auth state (loading / logged-out / logged-in)
│   │   │   ├── Loading.tsx           — spinner state
│   │   │   ├── TrackingStatus.tsx    — (extracted from current static panel)
│   │   │   └── RecentEmails.tsx      — (extracted from current static panel)
│   │   ├── pages/
│   │   │   ├── Login.tsx             — "Sign in with Google" → sendMessage OPEN_SIGN_IN
│   │   │   ├── Dashboard.tsx         — current static panel (status + recent emails + dashboard btn)
│   │   │   └── Settings.tsx          — (later, wired to the gear icon)
│   │   └── index.css                 — Tailwind entry
│   │
│   ├── types/
│   │   ├── auth.ts                   — User, AuthState shared by api + pages
│   │   └── tracking.ts               — (later) TrackedEmail, TrackingStats
│   │
│   └── constants/
│       └── api.ts                    — API_BASE_URL, message type constants
```

## Routing decision (Option A — state-based)

No router library. The popup is a 360px Chrome action window with no address bar, so URL/history routing is meaningless. `<AuthRouter />` calls `auth.api.me()` once on mount, then renders by state:

```
mount → loading spinner → auth.api.me()
  401  → <Login />          (Sign in with Google)
  200  → <Dashboard />     (Logged in as <name> + stats)
  error → <Login />        (with error message)
```

- State type: `AuthState = "loading" | "logged-out" | "logged-in"`
- If the same React code later becomes a web dashboard, switch to react-router-dom (`/login`, `/dashboard`, `/settings`) then. Not now.

## API layer details

### `src/constants/api.ts`
```ts
export const API_BASE_URL = "http://localhost:5000"; // dev; extension prod → https://<vercel-domain>
```

### `src/api/client.ts`
- Wraps `fetch` with `credentials: "include"` (sends the HttpOnly session cookie automatically),
- `Content-Type: application/json`,
- Parses the standardized server response shape `{ success, message, data }`,
- Throws typed `ApiClientError` on non-2xx (401 → triggers re-login state).

### `src/api/auth.api.ts`
```ts
me()     → GET  /api/auth/me        → User | null        (401 = not logged in)
login()  → sendMessage OPEN_SIGN_IN (no HTTP request; background opens tab)
logout() → POST /api/auth/logout    → clears session cookie
```

### `src/types/auth.ts`
```ts
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;   // google picture
  googleId: string;
}
type AuthState = "loading" | "logged-out" | "logged-in";
```

## Background — sign-in wiring

Popup never calls `chrome.tabs.create` directly. It sends a message; the background owns chrome.\* side effects:

```ts
// popup: Login.tsx
await chrome.runtime.sendMessage({ type: "OPEN_SIGN_IN" });

// background: index.ts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "OPEN_SIGN_IN") {
    chrome.tabs.create({ url: `${API_BASE_URL}/api/auth/google/login`, active: true });
    sendResponse({ ok: true });
  }
});
```

After the OAuth tab completes (server 302s back with `?success=1`), the popup re-runs `auth.api.me()` on open/refocus to flip to the logged-in view.

## Auth request flow (popup perspective)

```
Login button
   │ chrome.runtime.sendMessage({ type: "OPEN_SIGN_IN" })
   ▼
background → chrome.tabs.create(API_BASE_URL + "/api/auth/google/login")
   │ (full browser navigation — cookie-setting domain: the server)
   ▼
server → Google consent → callback → sets HttpOnly session cookie → 302 success
   │
   ▼
popup refocus → AuthRouter → auth.api.me()  (sends cookie)
   │
   ▼
200 { user } → Dashboard    |    401 → Login
```

## Security notes
- Session cookie is **HttpOnly + SameSite=Lax**, set by the server during callback navigation — the extension's JS never reads or writes it.
- Env secrets (`SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, `GOOGLE_CLIENT_SECRET`) **never reach the frontend**.
- `credentials: "include"` is the only thing the API client needs for the cookie to ride along.
- Extension cross-origin fetches to `http://localhost:5000/*` are covered by `host_permissions` in `manifest.json` (Chrome sends these without CORS blocking).

## Later additions (tracking module)
- `src/api/tracking.api.ts` → `GET /api/tracked-emails`, `GET /api/tracking/:id`, `POST /api/emails`
- `src/content/index.ts` → intercept Gmail compose/send, call `POST /api/emails` via background
- `Settings.tsx` → mailbox management (`POST /api/mailboxes`)