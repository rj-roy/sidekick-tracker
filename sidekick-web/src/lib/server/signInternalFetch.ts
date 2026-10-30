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
