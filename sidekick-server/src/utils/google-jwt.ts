import { createPublicKey, createVerify } from "crypto";
import type { KeyObject } from "crypto";
import { env } from "../config/env.js";
import { ApiError } from "./ApiError.js";

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const CLOCK_SKEW_SECONDS = 30;

export interface GoogleIdTokenClaims {
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  nonce?: string;
}

interface GoogleSigningKey {
  kid: string;
  key: KeyObject;
}

let cachedKeys: GoogleSigningKey[] | null = null;
let cachedAt = 0;
let cacheTtlMs = 60_000;

const parseCacheMaxAge = (header: string | null): number => {
  if (!header) return 3600;
  const match = /max-age=(\d+)/i.exec(header);
  return match ? Number(match[1]) : 3600;
};

const fetchGoogleKeys = async (force = false): Promise<GoogleSigningKey[]> => {
  const now = Date.now();

  if (!force && cachedKeys && now < cachedAt + cacheTtlMs) {
    return cachedKeys;
  }

  const response = await fetch(GOOGLE_CERTS_URL);

  if (!response.ok) {
    throw new ApiError(502, "Failed to fetch Google signing keys");
  }

  const body = (await response.json()) as {
    keys?: { kid?: string; n?: string; e?: string }[];
  };

  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    throw new ApiError(502, "Malformed Google signing keys response");
  }

  const keys: GoogleSigningKey[] = [];

  for (const k of body.keys) {
    if (!k.kid || !k.n || !k.e) continue;
    keys.push({
      kid: k.kid,
      key: createPublicKey({ key: { kty: "RSA", n: k.n, e: k.e }, format: "jwk" }),
    });
  }

  const maxAge = parseCacheMaxAge(response.headers.get("cache-control"));
  cacheTtlMs = Math.max(60_000, Math.min(maxAge * 1000, 24 * 60 * 60 * 1000));

  cachedKeys = keys;
  cachedAt = now;

  return keys;
};

const base64UrlDecode = (input: string): Buffer =>
  Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");

const verifySignature = (jwt: string, key: KeyObject): boolean => {
  const [headerB64, payloadB64, signatureB64] = jwt.split(".");

  if (!headerB64 || !payloadB64 || !signatureB64) return false;

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  return verifier.verify(key, base64UrlDecode(signatureB64));
};

const parseClaims = (payloadB64: string): GoogleIdTokenClaims => {
  try {
    const parsed = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Malformed claims");
    }
    return parsed as GoogleIdTokenClaims;
  } catch {
    throw new ApiError(401, "Invalid id_token payload", "INVALID_ID_TOKEN");
  }
};

export const verifyGoogleIdToken = async (
  idToken: string,
  expectedNonce?: string
): Promise<GoogleIdTokenClaims> => {
  const parts = idToken.split(".");

  if (parts.length !== 3) {
    throw new ApiError(401, "Invalid id_token", "INVALID_ID_TOKEN");
  }

  const [headerB64, payloadB64] = parts;

  let header: { alg?: string; kid?: string };
  try {
    header = JSON.parse(base64UrlDecode(headerB64!).toString("utf8"));
  } catch {
    throw new ApiError(401, "Invalid id_token header", "INVALID_ID_TOKEN");
  }

  if (header.alg !== "RS256") {
    throw new ApiError(401, "Unsupported id_token algorithm", "INVALID_ID_TOKEN");
  }

  const claims = parseClaims(payloadB64!);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (typeof claims.exp !== "number" || claims.exp < nowSeconds - CLOCK_SKEW_SECONDS) {
    throw new ApiError(401, "id_token expired", "INVALID_ID_TOKEN");
  }

  if (typeof claims.iat === "number" && claims.iat > nowSeconds + CLOCK_SKEW_SECONDS) {
    throw new ApiError(401, "id_token issued in the future", "INVALID_ID_TOKEN");
  }

  if (typeof claims.iss !== "string" || !GOOGLE_ISSUERS.includes(claims.iss)) {
    throw new ApiError(401, "id_token invalid issuer", "INVALID_ID_TOKEN");
  }

  const audMatches = Array.isArray(claims.aud)
    ? claims.aud.includes(env.google.clientId)
    : claims.aud === env.google.clientId;

  if (!audMatches) {
    throw new ApiError(401, "id_token audience mismatch", "INVALID_ID_TOKEN");
  }

  if (expectedNonce && claims.nonce !== expectedNonce) {
    throw new ApiError(401, "id_token nonce mismatch", "INVALID_ID_TOKEN");
  }

  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    throw new ApiError(401, "id_token missing subject", "INVALID_ID_TOKEN");
  }

  let keys = await fetchGoogleKeys();
  let signingKey = keys.find((k) => k.kid === header.kid);

  if (!signingKey) {
    keys = await fetchGoogleKeys(true);
    signingKey = keys.find((k) => k.kid === header.kid);
  }

  if (!signingKey) {
    throw new ApiError(401, "id_token unsigned by a known key", "INVALID_ID_TOKEN");
  }

  if (!verifySignature(idToken, signingKey.key)) {
    throw new ApiError(401, "Invalid id_token signature", "INVALID_ID_TOKEN");
  }

  return claims;
};