export type { DeviceInfo } from "./device.types.js";
export {
  deriveDeviceFromRequest,
  parseDeviceInfo,
  detectOS,
  detectBrowser,
  detectBrowserVersion,
  detectMobile,
} from "./device.service.js";