import {
  API_BASE_URL,
  AUTH_CALLBACK_PATH,
  OPEN_SIGN_IN_MESSAGE,
  SESSION_COOKIE_NAMES,
  SESSION_STORAGE_KEY,
  CSRF_STORAGE_KEY,
} from "../shared/constants/api";
import { sessionRemove, sessionSet } from "../shared/utils/storage";

const SESSION_COOKIE_DOMAIN = new URL(API_BASE_URL).hostname;

const findSessionCookie = async (): Promise<string | undefined> => {
  for (const name of SESSION_COOKIE_NAMES) {
    const cookie = await chrome.cookies.get({ url: API_BASE_URL, name });
    if (cookie) return cookie.value;
  }
  return undefined;
};

const syncSessionCookie = async (): Promise<void> => {
  const value = await findSessionCookie();

  if (value) {
    await sessionSet({ [SESSION_STORAGE_KEY]: value });
  } else {
    await sessionRemove([SESSION_STORAGE_KEY, CSRF_STORAGE_KEY]);
  }
};

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

chrome.cookies.onChanged.addListener((changeInfo) => {
  const { cookie, removed } = changeInfo;
  if (!SESSION_COOKIE_NAMES.includes(cookie.name)) return;
  if (cookie.domain !== SESSION_COOKIE_DOMAIN) return;

  syncSessionCookie();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!tab.url || !tab.url.startsWith(`${API_BASE_URL}${AUTH_CALLBACK_PATH}`)) return;

  const captureSession = async (retries = 8) => {
    const value = await findSessionCookie();

    if (value) {
      await sessionSet({ [SESSION_STORAGE_KEY]: value });
      chrome.tabs.remove(tabId);
      return;
    }

    if (retries > 0) {
      setTimeout(() => captureSession(retries - 1), 250);
    }
  };

  captureSession();
});