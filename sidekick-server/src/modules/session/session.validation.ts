import { ApiError } from "../../utils/ApiError.js";
import type { DeviceInfo } from "./session.types.js";

const cap = (value: unknown, max = 200): string | undefined => {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
};

const parseScreen = (value: unknown): { width: number; height: number } | undefined => {
  if (!value || typeof value !== "object") return undefined;

  const { width, height } = value as { width?: unknown; height?: unknown };
  if (
    typeof width !== "number" || !Number.isFinite(width) ||
    typeof height !== "number" || !Number.isFinite(height)
  ) {
    return undefined;
  }

  return { width, height };
};

export const parseDeviceInfo = (raw: unknown): DeviceInfo => {
  let value: unknown = raw;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new ApiError(400, "Device info is required");
    }
    try {
      value = JSON.parse(trimmed);
    } catch {
      throw new ApiError(400, "Malformed device info");
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "Malformed device info");
  }

  const obj = value as Record<string, unknown>;
  const deviceId = obj.deviceId;

  if (typeof deviceId !== "string" || !deviceId.trim()) {
    throw new ApiError(400, "Device ID is required", "DEVICE_ID_REQUIRED");
  }

  const fingerprints =
    obj.fingerprints && typeof obj.fingerprints === "object"
      ? (obj.fingerprints as Record<string, unknown>)
      : undefined;

  return {
    deviceId: deviceId.trim(),
    platform: cap(obj.platform) ?? "unknown",
    os: cap(obj.os) ?? "unknown",
    osVersion: cap(obj.osVersion),
    browser: cap(obj.browser),
    browserVersion: cap(obj.browserVersion),
    deviceType: cap(obj.deviceType),
    screen: parseScreen(obj.screen),
    language: cap(obj.language, 50),
    timezone: cap(obj.timezone, 100),
    userAgent: cap(obj.userAgent),
    isMobile: typeof obj.isMobile === "boolean" ? obj.isMobile : undefined,
    fingerprints,
  };
};