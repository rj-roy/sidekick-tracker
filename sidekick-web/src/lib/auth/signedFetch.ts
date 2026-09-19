import "server-only";
import crypto from "crypto";
import { statusHandler } from "../statusHandler";
import { ApiResponse } from "@/types/apiTypes";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

type Opts = { method?: string; body?: unknown; userToken?: string };

export async function signedFetch<T>(path: string, opts: Opts = {}): Promise<ApiResponse<T>> {
  const method = (opts.method ?? "GET").toUpperCase();
  const body = opts.body === undefined ? "" : JSON.stringify(opts.body);
  const ts = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const canonical = [method, path, ts, nonce, sha256(body)].join("\n");
  const sig = crypto
    .createHmac("sha256", process.env.INTERNAL_HMAC_SECRET!)
    .update(canonical)
    .digest("hex");

  const res = await fetch(`${process.env.API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-ts": ts,
      "x-nonce": nonce,
      "x-sig": sig,
      ...(opts.userToken ? { authorization: `Bearer ${opts.userToken}` } : {}),
    },
    body: body || undefined,
    cache: "no-store",
  });

  return statusHandler<T>(res);
}