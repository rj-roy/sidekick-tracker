# Session / Device Details — Future Work
getting device will from another func module
on google-accounts a device details will include with which device the account created,
on session device details will include on which devices are logged in 

## Context

Currently the session's `DeviceInfo` is built server-side from a spoofable `User-Agent`
header plus whatever id the client passes in `?device_id=`. It is session bookkeeping /
display metadata, **not** a reliable device identifier.

Sources today:

- `deviceId` → client `?device_id=` query param (`auth.controller.ts:12`) or random UUID
- `platform` → hardcoded `"web"`
- `os` / `browser` / `browserVersion` / `deviceType` / `isMobile` / `userAgent`
  → regex-parsed from the `User-Agent` header (`auth.service.ts:22-81`)

## Todos

- [ ] **Client-side device fingerprinting**
  - Collect a real fingerprint in the extension (canvas/WebGL hash, screen resolution,
    color depth, timezone, language, touch support).
  - Send the hash as `device_id` when starting OAuth instead of relying on server headers.
- [ ] **Pass real device metadata from the client**
  - Send explicit fields (`platform`, `os`, `browser`, `deviceType`) in the login payload
    instead of letting the server infer them from `User-Agent`.
  - Have `deriveDeviceFromRequest` use client-supplied values when present, else fall back
    to header parsing.
- [ ] **Fix hardcoded `platform: "web"`**
  - Should reflect the actual platform (web extension, android, etc.), not a constant.
- [ ] **Migrate `session.device.deviceId` usage**
  - `session.service.ts:82` compares device ids — clarify whether this should compare the
    fingerprint hash or a separate client-generated id.
- [ ] **Add device list / management API**
  - Expose sessions per user so users can view and revoke devices.
- [ ] **Validation hardening**
  - Ensure `device_id` from clients is length/sanitization bounded (currently only trimmed).

## Notes

- Google OAuth never provides device details; only the user profile (name/email/picture).
- `User-Agent` parsing in `auth.service.ts:58-81` stays as a coarse fallback only.

