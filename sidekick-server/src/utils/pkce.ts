import { createHash, randomBytes } from "crypto";

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

export const generatePkcePair = (): PkcePair => {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
};

export const generateNonce = (): string => randomBytes(16).toString("base64url");