import type { Request } from "express";
import type { DeviceInfo } from "./device.types.js";

export const detectOS = (ua: string): string => {
  if (/windows nt/i.test(ua)) return "windows";
  if (/mac os x|macintosh/i.test(ua)) return "macos";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/linux/i.test(ua)) return "linux";
  return "unknown";
};

export const detectBrowser = (ua: string): string => {
  if (/edg\//i.test(ua)) return "edge";
  if (/opr\/|opera/i.test(ua)) return "opera";
  if (/fxios|firefox/i.test(ua)) return "firefox";
  if (/crios|chrome/i.test(ua)) return "chrome";
  if (/safari/i.test(ua)) return "safari";
  return "unknown";
};

export const detectBrowserVersion = (ua: string): string | undefined => {
  const match = ua.match(/(?:edg|chrome|firefox|crios|opera|safari)\/([\d.]+)/i);
  return match?.[1];
};

export const detectMobile = (ua: string): boolean =>
  /mobile|android|iphone|ipad/i.test(ua);

export const deriveDeviceFromRequest = (req: Request, deviceId: string): DeviceInfo => {
  const ua = req.get("user-agent") ?? "";
  const isMobile = detectMobile(ua);

  return {
    deviceId,
    platform: "web",
    os: detectOS(ua),
    browser: detectBrowser(ua),
    browserVersion: detectBrowserVersion(ua),
    deviceType: isMobile ? "mobile" : "desktop",
    userAgent: ua || undefined,
    isMobile,
  };
};

export const parseDeviceInfo = (headerValue: string | undefined): DeviceInfo => {
  if (!headerValue || !headerValue.trim()) {
    throw new Error("missing device info header");
  }

  const parsed: unknown = JSON.parse(headerValue);

  if (!parsed || typeof parsed !== "object" || typeof (parsed as DeviceInfo).deviceId !== "string") {
    throw new Error("invalid device info");
  }

  return parsed as DeviceInfo;
};