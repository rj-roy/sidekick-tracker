import { randomBytes } from "crypto";

export const generateToken = (): string =>
  randomBytes(32).toString("base64url");
