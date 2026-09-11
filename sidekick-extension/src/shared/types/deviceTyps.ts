export interface ExtensionDeviceInfo {
  deviceId: string;
  platform: string;
  os: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  deviceType?: string;
  screen?: { width: number; height: number };
  language?: string;
  timezone?: string;
  userAgent?: string;
  isMobile?: boolean;
}
