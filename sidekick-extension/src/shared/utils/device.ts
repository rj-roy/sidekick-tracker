import { ExtensionDeviceInfo } from "../types/deviceTyps";

const STORAGE_KEY = "deviceId";

export const getOrCreateDeviceId = async (): Promise<string> => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const existing = stored[STORAGE_KEY];

  if (typeof existing === "string" && existing) return existing;

  const deviceId = crypto.randomUUID();
  await chrome.storage.local.set({ [STORAGE_KEY]: deviceId });
  return deviceId;
};

export const buildDeviceInfo = async (): Promise<ExtensionDeviceInfo> => {
  const deviceId = await getOrCreateDeviceId();
  const ua = navigator.userAgent;
  const uaData = navigator.userAgentData;

  const platform = uaData?.platform?.toLowerCase() ?? detectOS(ua);

  const browserInfo = uaData?.brands?.find(
    (b) => b.brand !== "Not;A=Brand" && b.brand !== "Chromium"
  );
  const browser = browserInfo?.brand ?? detectBrowser(ua);
  const browserVersion = browserInfo?.version ?? detectBrowserVersion(ua);

  const isMobile = uaData?.mobile ?? /mobile|android|iphone|ipad/i.test(ua);

  return {
    deviceId,
    platform,
    os: platform,
    browser,
    browserVersion,
    deviceType: isMobile ? "mobile" : "desktop",
    screen:
      typeof window !== "undefined" && window.screen
        ? { width: window.screen.width, height: window.screen.height }
        : undefined,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userAgent: ua,
    isMobile,
  };
};

const detectOS = (ua: string): string => {
  if (/windows nt/i.test(ua)) return "windows";
  if (/mac os x|macintosh/i.test(ua)) return "macos";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/linux/i.test(ua)) return "linux";
  return "unknown";
};

const detectBrowser = (ua: string): string => {
  if (/edg\//i.test(ua)) return "edge";
  if (/opr\/|opera/i.test(ua)) return "opera";
  if (/fxios|firefox/i.test(ua)) return "firefox";
  if (/crios|chrome/i.test(ua)) return "chrome";
  if (/safari/i.test(ua)) return "safari";
  return "unknown";
};

const detectBrowserVersion = (ua: string): string | undefined => {
  const match = ua.match(/(?:edg|chrome|firefox|crios|opera|safari)\/([\d.]+)/i);
  return match?.[1];
};
