import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { deny } from "../utils/denyReq.js";

declare module "http" {
    interface IncomingMessage { rawBody?: Buffer }
}

const MAX_SKEW_MS = 30_000;
const usedNounces = new Map<string, number>();

setInterval(() => {
    const now = Date.now();
    for (const [n, exp] of usedNounces) if (exp < now) usedNounces.delete(n);
}, 60_000).unref();

const sha256 = (b: Buffer | string) => crypto.createHash("sha256").update(b).digest("hex");

const secrets = () =>
    [env.crypto.signedHamcSecrete, process.env.INTERNAL_HMAC_SECRET_PREV].filter(Boolean) as string[];

export function verifyClientReq(req: Request, res: Response, next: NextFunction) {
    const ts = req.get("x-ts");
    const nonce = req.get("x-nonce");
    const sig = req.get("x-sig");

    if (!ts || !nonce || !sig || !/^[0-9a-f]{64}$/.test(sig)) return deny(res);

    if (!(Math.abs(Date.now() - Number(ts)) <= MAX_SKEW_MS)) return deny(res);
    if (usedNounces.has(nonce)) return deny(res);

    const bodyHash = sha256(req.rawBody ?? Buffer.alloc(0));
    const canonical = [req.method, req.originalUrl, ts, nonce, bodyHash].join("\n");
    const given = Buffer.from(sig, "hex");

    const ok = secrets().some((s) => {
        const expected = crypto.createHmac("sha256", s).update(canonical).digest();
        return crypto.timingSafeEqual(given, expected);
    });
    if (!ok) return deny(res);

    usedNounces.set(nonce, Date.now() + MAX_SKEW_MS * 2);
    next();
};