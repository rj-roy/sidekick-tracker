import "server-only";
import crypto from "crypto";
import { getClientInfo } from "./clientInfo";
import { apiUrl } from "./apiUrl";

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

type externalFetchOpts = {
    method?: string;
    headers?: Record<string, string>;
};

export async function externalApiFetch(path: string, opts: externalFetchOpts = {}): Promise<Response> {
    const method = (opts.method ?? "GET").toUpperCase();
    const ts = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString("hex");
    const canonical = [method, path, ts, nonce, sha256("")].join("\n");
    const sig = crypto
        .createHmac("sha256", process.env.INTERNAL_HMAC_SECRET!)
        .update(canonical)
        .digest("hex");

    const { ip, ua } = await getClientInfo();

    const resu = fetch(apiUrl(path), {
        method,
        headers: {
            "x-ts": ts,
            "x-nonce": nonce,
            "x-sig": sig,
            "x-client-ua": ua,
            "x-client-ip": ip,
            ...opts.headers,
        },
        cache: "no-store",
    });

    return resu;
}