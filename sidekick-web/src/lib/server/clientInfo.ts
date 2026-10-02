import { headers } from "next/headers";
import { isIP } from "net";

const MAX_UA_LENGTH = 512;
const PRINTABLE_ASCII = /^[\x20-\x7E]+$/;
const PRODUCT_TOKEN = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+/;
const SUSPICIOUS = /<script|<\/|javascript:|union\s+select|\$\{|\.\.\//i;

function validateUa(input: string | null | undefined): { valid: boolean; ua: string } {
    const ua = (input ?? "").trim();

    if (!ua) return { valid: false, ua: "" };
    if (ua.length < 8 || ua.length > MAX_UA_LENGTH) return { valid: false, ua: "" };
    if (!PRINTABLE_ASCII.test(ua)) return { valid: false, ua: "" };
    if (!PRODUCT_TOKEN.test(ua)) return { valid: false, ua: "" };
    if (SUSPICIOUS.test(ua)) return { valid: false, ua: "" };

    return { valid: true, ua };
};


function validateIp(input: string | null | undefined): {valid: boolean; ip: string} {
    let ip = (input ?? "").trim();

    if (!ip || ip.length > 45) return { valid: false, ip: "" };

    ip = ip.replace(/^::ffff:/i, "");

    if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.split(":")[0];

    const bracketed = ip.match(/^\[([^\]]+)\](?::\d+)?$/);
    if (bracketed) ip = bracketed[1];

    if (isIP(ip) === 0) return { valid: false, ip: "" };

    return { valid: true, ip: ip.toLowerCase() };
};

export async function getClientInfo(): Promise<{ ip: string; ua: string }> {
    const header = await headers();

    const rawIp = header.get("x-forwarded-for")?.split(",")[0].trim() || header.get("x-real-ip") || "";
    const rawUa = header.get("user-agent") ?? "";
    const { ua } = validateUa(rawUa);
    const { ip } = validateIp(rawIp);

    return { ip, ua };
};