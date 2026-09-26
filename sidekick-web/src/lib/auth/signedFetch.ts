import "server-only";
import crypto from "crypto";
import { statusHandler } from "../statusHandler";
import { ApiResponse } from "@/types/apiTypes";
import { getCookie, setCookie } from "../cookies";

type Opts = { method?: string; body?: unknown; headers?: Record<string, string> };

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

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

  const session = await getCookie("OG_L");
  const csrf = await getCookie("T_ls_");

  const res = await fetch(`${process.env.API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-ts": ts,
      "x-nonce": nonce,
      "x-sig": sig,
      ...(session ? { "x-session": session } : {}),
      ...(csrf ? { "x-csrf": csrf } : {}),
      ...opts.headers,
    },
    body: body || undefined,
    cache: "no-store",
  });

  const rotatedSession = res.headers.get("x-r-session-token");
  const rotatedCsrf = res.headers.get("x-r-csrf-token");

  if (rotatedSession) await setCookie("OG_L", rotatedSession);
  if (rotatedCsrf) await setCookie("T_ls_", rotatedCsrf);

  return statusHandler<T>(res);
};