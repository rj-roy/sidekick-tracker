import {
  API_BASE_URL,
  AUTH_CALLBACK_PATH,
  OPEN_SIGN_IN_MESSAGE,
  SESSION_COOKIE_NAME,
  SESSION_STORAGE_KEY,
} from "../shared/constants/api";

chrome.runtime.onInstalled.addListener(() => {
  console.log("SideKick background installed");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message?.type) {
    case OPEN_SIGN_IN_MESSAGE:
      chrome.tabs.create({
        url: `${API_BASE_URL}/auth/google/login`,
        active: true,
      });
      return sendResponse({ ok: true });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!tab.url || !tab.url.startsWith(`${API_BASE_URL}${AUTH_CALLBACK_PATH}`)) return;

  const captureSession = async (retries = 8) => {
    const cookie = await chrome.cookies.get({
      url: API_BASE_URL,
      name: SESSION_COOKIE_NAME,
    });

    if (cookie?.value) {
      await chrome.storage.local.set({ [SESSION_STORAGE_KEY]: cookie.value });
      chrome.tabs.remove(tabId);
      return;
    }

    if (retries > 0) {
      setTimeout(() => captureSession(retries - 1), 250);
    }
  };

  captureSession();
});