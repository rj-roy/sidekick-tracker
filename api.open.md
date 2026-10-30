# Tracking Open API — Implementation Spec

Public open-tracking pipeline (mail client → Next proxy → server), self-open handling, and security. Defaults chosen where unanswered: `id` = tracked-email `_id` (with `messageId` supported if supplied), one open row per event, self-opens are **marked** (`isSelf:true`) and excluded from counts, grace = 90s, rate limiting on both proxy edge and server.

---

# A. Public surface (Next proxy)

### A1. Fix token validator — EDIT `sidekick-web/src/lib/pixel.ts`
Change the pattern from `{32}` to `{43}` (real tokens are 43-char base64url).
```ts
export const pixelUrlFor = (token: string): string =>
    `${process.env.CLIENT_BASE}/api/track/${token}.gif`;

export const PIXEL_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const isValidPixelToken = (value: string): boolean => PIXEL_TOKEN_PATTERN.test(value);

export const stripGifExtension = (value: string): string =>
    value.endsWith(".gif") ? value.slice(0, -4) : value;

export const PIXEL_HEADERS = {
    "Content-Type": "image/gif",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
    "X-Content-Type-Options": "nosniff",
};
```

### A2. New file — CREATE `sidekick-web/src/lib/server/signInternalFetch.ts`
Session-less HMAC signer (do **not** reuse `signedFetch`; it requires `OG_L`/`T_ls_` cookies that a mail client never has).
```ts
import "server-only";
import crypto from "crypto";

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

type InternalFetchOpts = {
    method?: string;
    headers?: Record<string, string>;
};

// Signs proxy -> server calls with the shared INTERNAL_HMAC_SECRET.
// Mirrors server verifyClientReq canonical: [method, path, ts, nonce, sha256(body)].
// GET has an empty body, so body hash = sha256("").
export async function signInternalFetch(path: string, opts: InternalFetchOpts = {}): Promise<Response> {
    const method = (opts.method ?? "GET").toUpperCase();
    const ts = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString("hex");
    const canonical = [method, path, ts, nonce, sha256("")].join("\n");
    const sig = crypto
        .createHmac("sha256", process.env.INTERNAL_HMAC_SECRET!)
        .update(canonical)
        .digest("hex");

    return fetch(`${process.env.API_BASE}${path}`, {
        method,
        headers: {
            "x-ts": ts,
            "x-nonce": nonce,
            "x-sig": sig,
            ...opts.headers,
        },
        cache: "no-store",
    });
}
```

### A3. Rewrite the proxy route — EDIT `sidekick-web/src/app/api/track/[id]/route.ts`
Removes the `return console.log(req);` short-circuit, validates the 43-char token, forwards the *original* UA/IP, and always returns a GIF.
```ts
import { isValidPixelToken, PIXEL_HEADERS, stripGifExtension } from "@/lib/pixel";
import { getClientInfo } from "@/lib/server/clientInfo";
import { signInternalFetch } from "@/lib/server/signInternalFetch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 1x1 fully transparent GIF
const FALLBACK_GIF = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
);

const pixelResponse = (body: Buffer) =>
    new Response(new Uint8Array(body), { status: 200, headers: PIXEL_HEADERS });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const token = stripGifExtension(id ?? "");

    if (!isValidPixelToken(token)) {
        return pixelResponse(FALLBACK_GIF);
    }

    const { ua, ip } = await getClientInfo();

    try {
        const res = await signInternalFetch(`/pixel/open/${token}`, {
            method: "GET",
            headers: {
                "x-client-ua": ua,
                "x-client-ip": ip,
            },
        });

        if (!res.ok) return pixelResponse(FALLBACK_GIF);
        return pixelResponse(Buffer.from(await res.arrayBuffer()));
    } catch (error) {
        console.error("[pixel] forward failed:", error);
        return pixelResponse(FALLBACK_GIF);
    }
}
```
Only `GET` is exported → Next returns 405 for other methods automatically. Put your public rate limit at the reverse proxy/Cloudflare (Next route handlers have no Redis here).

---

# B. Server — data model + open pipeline

### B1. Types — EDIT `sidekick-server/src/modules/tracking/tracking.types.ts`
```ts
import type { ObjectId } from "mongodb";

export type TrackedEmailStatus = "pending" | "sent" | "opened";

export interface TrackedEmailDoc {
    userId: ObjectId;
    uniqueToken: string;
    status: TrackedEmailStatus;
    messageId?: string;
    subject?: string;
    recipient: string[];
    recipientCount: number;
    opened: boolean;
    openCount: number;
    sentAt?: Date;
    firstOpenedAt?: Date;
    lastOpenedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface EmailOpenDoc {
    trackedEmailId: ObjectId;
    userId: ObjectId;
    uniqueToken: string;
    messageId?: string;
    openedAt: Date;
    userAgent: string;
    ip: string;
    isMobile: boolean;
    os: string;
    browser: string;
    isSelf: boolean;
}

export interface OpenContext {
    userAgent: string;
    ip: string;
    isMobile: boolean;
    os: string;
    browser: string;
}
```

### B2. UA parse helper — EDIT `sidekick-server/src/utils/user/userInfo.ts`
Append (keeps existing `uaFamily` intact):
```ts
export const parseUa = (userAgent: string): { os: string; browser: string; isMobile: boolean } => {
    const os = detectOs(userAgent);
    const browser = detectBrowser(userAgent);
    const isMobile = os === "ios" || os === "android" || /Mobi|Mobile/i.test(userAgent);
    return { os, browser, isMobile };
};
```

### B3. Env — EDIT `sidekick-server/src/config/env.ts`
Add a `tracking` block to the exported `env` object (near `jobs`):
```ts
  tracking: {
    selfOpenGraceMs: nonNegativeInt("SELF_OPEN_GRACE_MS", 90_000),
  },
```
(Add `SELF_OPEN_GRACE_MS=90000` to `.env`/`.env.example` optionally.)

### B4. Repository — EDIT `sidekick-server/src/modules/tracking/tracking.repository.ts`
Full replacement:
```ts
import { MongoServerError, type ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { ensureDB } from "../../database/mongodb.js";
import type { EmailOpenDoc } from "./tracking.types.js";

const trackedEmails = async () => {
    const db = await ensureDB();
    return db.collection(env.mongodb.collections.trackedEmails);
};

const emailOpens = async () => {
    const db = await ensureDB();
    return db.collection(env.mongodb.collections.emailOpens);
};

export const TrackingRepository = {
    async markTrackedEmailSent(
        uniqueToken: string,
        userId: ObjectId,
        meta: { sentAt: Date; subject?: string; recipient?: string[]; messageId?: string },
    ) {
        const recipients = meta.recipient ?? [];
        const now = new Date();

        const set = {
            status: "sent" as const,
            recipient: recipients,
            recipientCount: recipients.length,
            sentAt: meta.sentAt,
            updatedAt: now,
            ...(meta.subject !== undefined ? { subject: meta.subject } : {}),
            ...(meta.messageId !== undefined ? { messageId: meta.messageId } : {}),
        };

        try {
            return await (await trackedEmails()).updateOne(
                { userId, uniqueToken },
                {
                    $set: set,
                    $setOnInsert: {
                        userId,
                        uniqueToken,
                        opened: false,
                        openCount: 0,
                        createdAt: now,
                    },
                },
                { upsert: true },
            );
        } catch (error) {
            if (error instanceof MongoServerError && error.code === 11000) {
                const existing = await (await trackedEmails()).updateOne(
                    { userId, uniqueToken },
                    { $set: set },
                );
                return existing.matchedCount > 0 ? existing : null;
            }
            throw error;
        }
    },

    async findTrackedEmailByToken(uniqueToken: string) {
        return await (await trackedEmails()).findOne({ uniqueToken });
    },

    async insertOpen(doc: EmailOpenDoc) {
        return await (await emailOpens()).insertOne(doc);
    },

    async markOpened(
        trackedEmailId: ObjectId,
        openedAt: Date,
        options: { countOpen: boolean; setFirst: boolean },
    ) {
        const $set: Record<string, unknown> = { updatedAt: openedAt };

        if (options.countOpen) {
            $set.status = "opened";
            $set.opened = true;
            $set.lastOpenedAt = openedAt;
            if (options.setFirst) $set.firstOpenedAt = openedAt;
        }

        return await (await trackedEmails()).updateOne(
            { _id: trackedEmailId },
            options.countOpen ? { $inc: { openCount: 1 }, $set } : { $set },
        );
    },
};
```

### B5. Service — EDIT `sidekick-server/src/modules/tracking/tracking.service.ts`
Full replacement:
```ts
import type { ObjectId } from "mongodb";
import { TrackingRepository } from "./tracking.repository.js";
import { hash } from "../../utils/security/crypto.js";
import { env } from "../../config/env.js";
import type { OpenContext } from "./tracking.types.js";

const MAX_SUBJECT_LENGTH = 200;
const MAX_RECIPIENTS = 100;

export const TrackingService = {
    async markTrackedEmailSent(
        token: string,
        userId: ObjectId,
        meta: { subject?: string; recipient?: string[]; sentAt?: Date; messageId?: string },
    ) {
        const uniqueToken = hash(token);
        return await TrackingRepository.markTrackedEmailSent(uniqueToken, userId, {
            sentAt: meta.sentAt ?? new Date(),
            subject: meta.subject?.trim().slice(0, MAX_SUBJECT_LENGTH),
            recipient: (meta.recipient ?? []).slice(0, MAX_RECIPIENTS),
            messageId: meta.messageId,
        });
    },

    async recordOpen(token: string, ctx: OpenContext) {
        const uniqueToken = hash(token);
        const email = await TrackingRepository.findTrackedEmailByToken(uniqueToken);
        if (!email) return null;

        const openedAt = new Date();
        const withinGrace =
            email.sentAt instanceof Date
                ? openedAt.getTime() - email.sentAt.getTime() < env.tracking.selfOpenGraceMs
                : false;

        const isSelf = withinGrace;

        await TrackingRepository.insertOpen({
            trackedEmailId: email._id,
            userId: email.userId,
            uniqueToken,
            ...(email.messageId ? { messageId: email.messageId } : {}),
            openedAt,
            userAgent: ctx.userAgent,
            ip: ctx.ip,
            isMobile: ctx.isMobile,
            os: ctx.os,
            browser: ctx.browser,
            isSelf,
        });

        const countOpen = !isSelf;
        await TrackingRepository.markOpened(email._id, openedAt, {
            countOpen,
            setFirst: countOpen && !email.firstOpenedAt,
        });

        return email;
    },
};
```

### B6. Controller — EDIT `sidekick-server/src/modules/tracking/tracking.controller.ts`
Uncomment/blow away the dead pixel code and add the real `open` + `markSent` plumbing. Full replacement:
```ts
import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/http/ApiRsponse.js";
import { ApiError } from "../../utils/error/ApiError.js";
import { TrackingService } from "./tracking.service.js";
import { validateIp, validateUa } from "../../utils/user/verifyUserInfo.js";
import { parseUa } from "../../utils/user/userInfo.js";
import type { OpenContext } from "./tracking.types.js";

// 1x1 fully transparent GIF
const PIXEL_GIF = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
);

const sendPixel = (res: Response): Response => {
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Content-Length", String(PIXEL_GIF.length));
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).end(PIXEL_GIF);
};

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const isValidTrackingToken = (value: unknown): value is string =>
    typeof value === "string" && TOKEN_RE.test(value);

const openContext = (req: Request): OpenContext => {
    const { userAgent } = validateUa(req.get("x-client-ua") || req.get("user-agent") || "");
    const { clientIp } = validateIp(
        req.get("x-client-ip") || req.get("x-forwarded-for") || req.ip || ""
    );
    const { os, browser, isMobile } = parseUa(userAgent === "unknown" ? "" : userAgent);
    return { userAgent, ip: clientIp, isMobile, os, browser };
};

export const TrackingController = {
    async markSent(req: Request, res: Response) {
        if (!req.userId) {
            throw new ApiError(401, "Authentication required", "SESSION_INVALID");
        }

        const body = (req.body ?? {}) as {
            trackingToken?: unknown;
            subject?: unknown;
            recipient?: string[];
            sentAt?: unknown;
            messageId?: unknown;
        };

        if (typeof body.trackingToken !== "string" || body.trackingToken.length === 0) {
            throw new ApiError(400, "Missing tracking trackingToken", "TRACKING_TOKEN_MISSING");
        }

        const updated = await TrackingService.markTrackedEmailSent(body.trackingToken, req.userId, {
            subject: typeof body.subject === "string" ? body.subject : undefined,
            recipient: body.recipient ?? [],
            sentAt: typeof body.sentAt === "number" ? new Date(body.sentAt) : undefined,
            messageId: typeof body.messageId === "string" ? body.messageId : undefined,
        });

        if (!updated) {
            throw new ApiError(404, "Unknown tracking token", "TRACKING_NOT_FOUND");
        }

        return ApiResponse.success(res, "Tracked email marked as sent", updated, 200);
    },

    async open(req: Request, res: Response) {
        const token = req.params.token;

        // unknown/invalid tokens still return a pixel so the mail never renders broken
        if (!isValidTrackingToken(token)) {
            return sendPixel(res);
        }

        try {
            const recorded = await TrackingService.recordOpen(token, openContext(req));
            if (!recorded) console.warn("[tracking] open for unknown token");
        } catch (err) {
            console.error("[tracking] failed to record open:", err);
        }

        return sendPixel(res);
    },
};
```

### B7. Public router — EDIT `sidekick-server/src/modules/tracking/public-tracking.routes.ts`
Full replacement. NOTE: it is now mounted **after** `verifyClientReq`, so it requires the internal HMAC but no user session.
```ts
import { Router, type Request } from "express";
import { asyncHandler } from "../../utils/http/async-handler.js";
import { createRateLimit } from "../../middleware/rate-limit.middleware.js";
import { TrackingController } from "./tracking.controller.js";

const router = Router();

// key = clientIp:token — limits amplification per token and per client
const pixelKey = (req: Request): string => {
    const token = req.path.split("/").pop() ?? "none";
    return `${req.get("x-client-ip") ?? req.ip ?? "anon"}:${token}`;
};

// requested by the trusted Next proxy (HMAC-signed). Mounted AFTER verifyClientReq,
// so no user cookie is needed but unsigned/direct hits are rejected.
router.get(
    "/open/:token",
    createRateLimit({ windowMs: 60_000, limit: 120, keyGenerator: pixelKey }),
    asyncHandler(TrackingController.open)
);

export default router;
```

### B8. Barrel export — EDIT `sidekick-server/src/modules/tracking/index.ts`
```ts
export { default as trackingRouter } from "./tracking.routes.js";
export { default as publicTrackingRouter } from "./public-tracking.routes.js";
export { TrackingService } from "./tracking.service.js";
```

### B9. App wiring — EDIT `sidekick-server/src/app.ts`
Change the import and mount the pixel router **after** `verifyClientReq`:
```ts
import { trackingRouter, publicTrackingRouter } from "./modules/tracking/index.js";
// ...
// (delete the dead commented block at old lines 71-72)
app.use(verifyClientReq);
app.use(cookieParser());

app.get("/api/health", async (_req, res) => {
    res.json({ status: "ok", message: "Server is runnig perfectly" });
});

// Signed by the Next proxy (INTERNAL_HMAC_SECRET). No user auth; verifyClientReq already ran.
app.use("/pixel", publicTrackingRouter);
app.use("/tracking", trackingRouter);
app.use("/auth", authRouter);
```

### B10. Forward `messageId` — EDIT `sidekick-web/src/app/api/tracking/sent/route.ts`
Already forwards `sentAt`; add `messageId` if present:
```ts
interface MarkSentBody {
    recipient: string[];
    trackingToken?: string;
    subject?: string;
    sentAt?: number;
    messageId?: string;
}
// inside the signedFetch body:
body: {
    trackingToken: body.trackingToken,
    recipient: body.recipient ?? [],
    ...(typeof body.subject === "string" ? { subject: body.subject } : {}),
    ...(typeof body.sentAt === "number" ? { sentAt: body.sentAt } : {}),
    ...(typeof body.messageId === "string" ? { messageId: body.messageId } : {}),
},
```

---

# C. Optional — extension-side self-open neutralization (best-effort, Gmail)

The sender's own Sent view is fetched via `googleusercontent`; grace handles immediate cases, but not a Sent view later. This prevents the browser-triggered fetch at the source. It targets the **rendered message**, never the compose editor (removing it there would strip the pixel before it's sent).

### C1. EDIT `sidekick-extension/src/entrypoints/content/index.ts`
Change run timing so we can catch images before they load:
```ts
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main(ctx) { /* existing body */ },
});
```

### C2. CREATE `sidekick-extension/src/feature/email-tracking/content/selfOpenGuard.ts`
```ts
import { EDITOR_SELECTOR } from "./selectors";

const TRACK_SRC = /\/api\/track\/[A-Za-z0-9_-]{43}\.gif/i;

const neutralize = (img: HTMLImageElement): void => {
    if (img.dataset.sidekickNeutralized) return;
    // never touch the composer (that pixel must be sent)
    if (img.closest(EDITOR_SELECTOR)) return;
    if (!TRACK_SRC.test(img.currentSrc || img.src || "")) return;

    img.dataset.sidekickNeutralized = "1";
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
};

const sweep = (root: ParentNode): void => {
    root.querySelectorAll<HTMLImageElement>("img").forEach(neutralize);
};

export const initSelfOpenGuard = (): void => {
    sweep(document);
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            m.addedNodes.forEach((node) => {
                if (node instanceof HTMLImageElement) neutralize(node);
                else if (node instanceof HTMLElement) sweep(node);
            });
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
};
```
Then call `initSelfOpenGuard()` inside `initGmailListeners()` in `content/index.ts`.

Caveat: race against Gmail preloading remains; treat this as best-effort hardening, not a guarantee.

---

# D. Resulting behavior

- Mail client → public Next proxy (`/api/track/<token>.gif`) → HMAC-signed server call (`/pixel/open/<token>`), no cookies.
- Server `email_opens` row: `{ trackedEmailId, userId, uniqueToken, messageId?, openedAt, userAgent, ip, isMobile, os, browser, isSelf }`.
- `pixel_injected_mails`: `openCount++`, `opened:true`, `status:"opened"`, `firstOpenedAt` (first non-self only), `lastOpenedAt`; `isSelf` events are stored but not counted.
- Direct server hits without a valid HMAC are rejected by `verifyClientReq` before any DB access.

---

# Decisions still open
1. `SELF_OPEN_GRACE_MS` — 90s OK, or different?
2. `messageId`: do the extension additions (send `messageId` from `background` + map token→messageId) now, or ship `_id`-only and add later? B10 already accepts it server-side.
3. IP privacy: store raw (current) or truncate/hash?
4. Want the `emailOpens` read endpoint (e.g. `GET /tracking/:token/opens`) now, or write-only for this pass?
