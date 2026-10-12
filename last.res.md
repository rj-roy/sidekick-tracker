# Sidekick — Session Context (read this after re-run)

Repo: `/home/rj-fe/Documents/projects/sidekick` (monorepo)
- Extension: `sidekick-extension` (WXT + React/TS, typecheck = `npm run compile` → `tsc --noEmit`)
- Server: `sidekick-server` (Express + MongoDB)
- Web/Next proxies: `sidekick-web` (Next.js API routes)

## Task in progress
Adding **recipient collection** to email tracking, and fixing **duplicate DB saves** on send.

Field name chosen by user is the **singular `recipient: string[]`** everywhere (not `recipients`).

---

## Current state of the recipient work (extension)

### `src/feature/email-tracking/content/compose.ts`
- `recipientsFromCompose(root)` (line ~54) reads every `span[email]` (To/Cc/Bcc), lowercases, trims, dedupes:
  ```ts
  export const recipientsFromCompose = (root: HTMLElement | null): string[] => {
      if (!root) return [];
      return Array.from(root.querySelectorAll<HTMLElement>(RECIPIENT_SELECTOR))
          .map((el) => el.getAttribute("email")?.trim().toLowerCase() ?? "")
          .filter((value, index, all) => value.length > 0 && all.indexOf(value) === index);
  };
  ```
- `getComposeState()` returns `recipient: recipientsFromCompose(root)` and `recipientCount: recipient.length`.
- NOTE: `recipientsFromCompose` is defined **after** `getComposeState` uses it (line 42 vs 54). `tsc` does NOT error (call runs post-init) but could be reordered for cleanliness.

### `src/feature/email-tracking/content/sentDetector.ts`
- `PendingSend = { trackingToken: string; subject: string; at: number; recipient: string[] }`
- `sendIntentFromClick` / `sendIntentFromKey` populate `recipient: recipientsFromCompose(...)`.
- `flushPendingSends(token)` passes `recipient: p.recipient` into `notifyEmailSent`.

### `src/feature/email-tracking/TrackingTypes.ts`
- `CreatePixelPayload` → has `recipientCount: number; recipient: string[]`
- `ComposeState` → has `recipientCount: number; recipient: string[]`
- `TrackedDraft` → has `recipient: string[]`
- `EmailSentPayload` → `{ trackingToken; subject; recipient: string[]; sentAt }`
- `EmailSentMessage` → `{ type: EMAIL_SENT; trackingToken; subject; sentAt; recipient: string[] }`

### `src/feature/email-tracking/trackingService.ts` (current)
- Line 34: `PixelApi.create({ status: "draft" })` (subject/recipient were removed at some point)
- `saveDraft({ id: messageId, trackingToken, recipient: state.recipient ?? [], subject: state.subject ?? "", status: "draft", updatedAt: Date.now() })`
- Early-returns when `state.trackedToken` exists (line 30-32), so `saveDraft` only runs on FIRST track.

### `src/entrypoints/background/index.ts`
- `case EMAIL_SENT` currently destructures `{ trackingToken, subject, sentAt, recipient }` and calls
  `MailApi.markSent({ trackingToken, subject, sentAt, recipient: recipient ?? [] })`.
- `GET_COMPOSE_STATE` fallback: `{ supported: false, hasCompose: false, recipient: [], recipientCount: 0 }`

---

## Known type error (was)
`background/index.ts(74,26): error TS2304: Cannot find name 'recipient'` — caused by `recipient` used in `MailApi.markSent` but missing from the destructure. USER WAS TOLD TO ADD `recipient` TO THE DESTRUCTURE. Verify current file state.

---

## Duplicate-save analysis (the current question)

User reports: "clicking send then ... pixel hitting the database also saving again."

Root causes found:
1. **Client re-sends EMAIL_SENT for same token** — `sentDetector.ts:41-52`. `record()` pushes a PendingSend on EVERY qualifying click (`:56`) / Ctrl-Cmd+Enter (`:57`). Double-click or click+shortcut → multiple entries with same token → `filter` returns all → `for` loop fires `notifyEmailSent` multiple times. No dedupe by token anywhere.
2. **Background no idempotency** — `background/index.ts:59-90` handles each EMAIL_SENT unconditionally → `MailApi.markSent`.
3. **Server inserts instead of upserting** — `sidekick-server/src/modules/tracking/tracking.repository.ts:29-38` uses `insertOne` every call.
   - Stores hash in field `trackingToken`, BUT unique index is on `uniqueToken` (`sidekick-server/src/database/init.indexs.ts:18`, partial filter on `uniqueToken`). Field mismatch → index never applies → duplicates allowed.
4. **Latent pixel self-hit** — `pixel.ts:20` / `:35` set real `img.src` while composing; browser fetches pixel immediately. Open path currently disabled (`sidekick-web/src/app/api/track/[id]/route.ts` fully commented; server `/open/:token` commented in `public-tracking.routes.ts` + controller), so no DB write yet.

### Proposed fixes (not yet applied)
- Client: dedupe tokens in `flushPendingSends` before looping (keep latest subject/recipient per token).
- Background: in-memory Set/TTL of already-sent tokens; skip repeats.
- Server: `updateOne({ userId, trackingToken: uniqueToken }, { $set..., $setOnInsert... }, { upsert: true })`; and either store field as `uniqueToken` to match the index or add a unique index on `trackingToken`.

---

## OPEN QUESTIONS (user had not answered yet)
1. Duplicates are LOCAL (`trackedDrafts` in `browser.storage.sync`) or MONGO rows (`trackedEmails`)?
2. One row per Send, or one row per recipient (fan-out by `recipient[]`)?
3. May I edit server (`sidekick-server`) and Next proxies (`sidekick-web`), or extension-only?
4. Duplicate triggered by double-click/Enter+click, or a single clean send?

## Next step
Wait for user's answer to the 4 questions, then implement the chosen duplicate-save fix (and finish/verify recipient plumbing). Run `npm run compile` in `sidekick-extension` after changes.
