# SideKick Extension Structure

Google Mail tracking extension — Chrome MV3, React 19 + Vite + Tailwind.
Feature-based architecture: each feature owns its API, types, and components.
The server routes are not affected by this split — they stay as mapped in `auth-requiremet.md` (`/api/auth/me`, `/api/auth/google/login`, `/api/auth/google/callback`, `/api/auth/logout`).

## Core principle

**Shared layer** (`src/shared/`) holds cross-cutting concerns: API client, error handling, types, constants.
**Features** (`src/features/`) are self-contained modules with their own API, types, and components.

```
shared/           → reusable utilities (API client, error handling, types)
features/         → self-contained feature modules (auth, dashboard, tracking, settings)
popup/            → thin shell (App.tsx, main.tsx, CSS)
background/       → chrome.* side effects (tab creation, message routing)
content/          → Gmail DOM injection
```

### Core rule

Each feature owns its own API, types, and components — and **only** code that belongs to that feature. Post-auth UI (Dashboard) lives in `features/dashboard/`, tracking UI (TrackingStatus) lives in `features/tracking/`, not inside `features/auth/`. The thin surfaces (`popup/`, `background/`, `content/`) never contain feature UI; they compose features together.

## Full structure

```
sidekick-extension/
├── index.html                        — popup HTML root
├── manifest.json                     — MV3 config (permissions, host_permissions)
├── vite.config.ts                    — multi-entry build (background / content / popup)
├── package.json
├── tsconfig.json
├── src/
│   ├── shared/
│   │   ├── api/
│   │   │   ├── client.ts             — fetch wrapper (BASE_URL, credentials:"include", JSON, error handling)
│   │   │   └── index.ts             — barrel
│   │   ├── types/
│   │   │   ├── api.ts               — ApiEnvelope<T>
│   │   │   └── index.ts             — barrel
│   │   ├── utils/
│   │   │   ├── apiRequest.ts         — core fetch logic
│   │   │   ├── errorHandler.ts       — ApiClientError class
│   │   │   └── index.ts             — barrel
│   │   └── constants/
│   │       └── api.ts               — API_BASE_URL, message type constants
│   │
│   ├── features/
│   │   ├── auth/                      — authentication only
│   │   │   ├── api/
│   │   │   │   └── index.ts         — me(), login(), logout() → calls /api/auth/*
│   │   │   ├── types/
│   │   │   │   └── index.ts         — User, AuthState
│   │   │   └── components/
│   │   │       ├── index.ts          — barrel
│   │   │       ├── MainRouter.tsx    — auth gate: decides view by state (loading / logged-out / logged-in)
│   │   │       ├── Login.tsx         — "Sign in with Google" → sendMessage OPEN_SIGN_IN
│   │   │       └── Loading.tsx       — spinner state
│   │   │
│   │   ├── dashboard/                 — post-auth home screen
│   │   │   └── components/
│   │   │       ├── index.ts          — barrel
│   │   │       └── Dashboard.tsx     — recent emails + dashboard btn (composes TrackingStatus)
│   │   │
│   │   ├── tracking/                  — tracking analytics
│   │   │   └── components/
│   │   │       ├── index.ts          — barrel
│   │   │       └── TrackingStatus.tsx — tracking stats panel (ON/OFF, open/click/deliver)
│   │   │
│   │   └── settings/                  — (planned) mailbox management
│   │       ├── api/
│   │       ├── types/
│   │       └── components/
│   │
│   ├── popup/
│   │   ├── main.tsx                  — React entry (mounts <App />)
│   │   ├── App.tsx                   — thin shell → mounts <MainRouter />
│   │   └── index.css                 — Tailwind entry
│   │
│   ├── background/
│   │   └── index.ts                  — chrome.runtime.onMessage handler → chrome.tabs.create for sign-in
│   │
│   └── content/
│       └── index.ts                  — Gmail DOM injection (later: compose/send interception)
```

## Adding a new feature

Features are self-contained and follow the same pattern. To add a **Settings** feature:

```
src/features/settings/
├── api/
│   └── index.ts         — settingsApi.get(), settingsApi.update()
├── types/
│   └── index.ts         — Settings interface
└── components/
    ├── index.ts          — barrel
    └── Settings.tsx      — settings page
```

Then import in a feature component that renders it (e.g. `MainRouter.tsx` or `Dashboard.tsx`) — never dump it inside an unrelated feature.

## Composition chain

The popup surface stays thin; features are composed through imports:

```
popup/App.tsx
  └─ features/auth/components/MainRouter.tsx      (auth gate)
       ├─ auth/Login.tsx · auth/Loading.tsx        (auth UI)
       └─ dashboard/components/Dashboard.tsx       (post-auth home)
            └─ tracking/components/TrackingStatus.tsx (tracking analytics)
```

## Routing decision (Option A — state-based)

No router library. The popup is a 360px Chrome action window with no address bar, so URL/history routing is meaningless. `<MainRouter />` calls `authApi.me()` once on mount, then renders by state:

```
mount → loading spinner → authApi.me()
  401  → <Login />          (Sign in with Google)
  200  → <Dashboard />     (Logged in — dashboard home from features/dashboard)
  error → <Login />        (with error message)
```

- State type: `AuthState = "loading" | "logged-out" | "logged-in"`
- If the same React code later becomes a web dashboard, switch to react-router-dom (`/login`, `/dashboard`, `/settings`) then. Not now.

## API layer details

### `src/shared/constants/api.ts`
```ts
export const API_BASE_URL = "http://localhost:5000"; // dev; extension prod → https://<vercel-domain>
```

### `src/shared/api/client.ts`
- Wraps `fetch` with `credentials: "include"` (sends the HttpOnly session cookie automatically),
- `Content-Type: application/json`,
- Parses the standardized server response shape `{ success, message, data }`,
- Throws typed `ApiClientError` on non-2xx (401 → triggers re-login state).

### `src/features/auth/api/index.ts`
```ts
me()     → GET  /api/auth/me        → User | null        (401 = not logged in)
login()  → sendMessage OPEN_SIGN_IN (no HTTP request; background opens tab)
logout() → POST /api/auth/logout    → clears session cookie
```

### `src/features/auth/types/index.ts`
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

Popup never calls `chrome.tabs.create` directly. It sends a message; the background owns chrome.* side effects:

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

After the OAuth tab completes (server 302s back with `?success=1`), the popup re-runs `authApi.me()` on open/refocus to flip to the logged-in view.

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
popup refocus → MainRouter → authApi.me()  (sends cookie)
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
- `src/features/tracking/api/index.ts` → `GET /api/tracked-emails`, `GET /api/tracking/:id`, `POST /api/emails` (the feature folder already exists with its UI)
- `src/content/index.ts` → intercept Gmail compose/send, call `POST /api/emails` via background
- `src/features/settings/` → mailbox management (`POST /api/mailboxes`)
