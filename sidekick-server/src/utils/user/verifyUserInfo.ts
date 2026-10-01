import { isIP } from "node:net";

export function validateUa(input: unknown): { valid: boolean; userAgent: string } {
  const MAX_UA_LENGTH = 512;
  const PRINTABLE_ASCII = /^[\x20-\x7E]+$/;
  const PRODUCT_TOKEN = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+/;
  const SUSPICIOUS = /<script|<\/|javascript:|union\s+select|\$\{|\.\.\//i;

  if (typeof input !== "string") {
    return { valid: false, userAgent: "unknown" };
  };

  const ua = input.trim();

  if (
    !ua ||
    ua.length < 8 ||
    ua.length > MAX_UA_LENGTH ||
    !PRINTABLE_ASCII.test(ua) ||
    !PRODUCT_TOKEN.test(ua) ||
    SUSPICIOUS.test(ua)
  ) {
    return { valid: false, userAgent: "unknown" };
  };

  return { valid: true, userAgent: ua, };
};

export function validateIp(input: unknown): { valid: boolean; clientIp: string } {
  const MAX_IP_LENGTH = 45;

  if (typeof input !== "string") return { valid: false, clientIp: "unknown" };

  let ip = input.trim();

  if (!ip || ip.length > MAX_IP_LENGTH) return { valid: false, clientIp: "unknown" };

  ip = ip.replace(/^::ffff:/i, "");

  const ipv4WithPort = ip.match(/^(?<address>\d{1,3}(?:\.\d{1,3}){3}):\d+$/);

  if (ipv4WithPort?.groups?.address) {
    ip = ipv4WithPort.groups.address;
  };

  const bracketed = ip.match(/^\[([^\]]+)\](?::\d+)?$/);

  if (bracketed?.[1]) {
    ip = bracketed[1];
  };

  if (isIP(ip) === 0) return { valid: false, clientIp: "unknown" };

  return { valid: true, clientIp: ip.toLowerCase(), };
};