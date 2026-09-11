import { API_BASE_URL, OPEN_SIGN_IN_MESSAGE } from "../shared/constants/api";
import { getOrCreateDeviceId } from "../shared/utils/device";

chrome.runtime.onInstalled.addListener(() => {
  console.log("SideKick background installed");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case OPEN_SIGN_IN_MESSAGE: {
        const deviceId = await getOrCreateDeviceId();
        chrome.tabs.create({
          url: `${API_BASE_URL}/auth/google/login?device_id=${deviceId}`,
          active: true,
        });
        sendResponse({ ok: true });
        return;
      }

      default:
        sendResponse({ ok: false });
    }
  })();

  return true;
});