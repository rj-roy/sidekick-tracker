import { API_BASE_URL, OPEN_SIGN_IN_MESSAGE } from "@/shared/constants/api";
import { PixelApi } from "@/feature/email-tracking/api";
import { GET_COMPOSE_STATE, GMAIL_COMPOSE_URL, INJECT_PIXEL, isGmailUrl, TRACK_EMAIL } from "@/feature/email-tracking/messages";
import type { ComposeState, InjectPixelResult, TrackResult } from "@/feature/email-tracking/types";
import { apiClientError } from "@/shared/utils/apiClientError";

//used: true
const activeTab = async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
};

const askContentScript = async <T>(tabId: number, message: unknown): Promise<T | null> => {
  try {
    return (await browser.tabs.sendMessage(tabId, message)) as T;
  } catch {
    return null;
  }
};

const trackActiveEmail = async (): Promise<TrackResult> => {
  const tab = await activeTab();

  if (tab?.id === undefined || !isGmailUrl(tab.url)) {
    await browser.tabs.create({ url: GMAIL_COMPOSE_URL, active: true });
    return { ok: false, reason: "no-gmail-tab" };
  };

  const state = await askContentScript<ComposeState>(tab.id, { type: GET_COMPOSE_STATE });

  if (!state) {
    return { ok: false, reason: "content-unreachable" };
  };

  if (!state.hasCompose) {
    return { ok: false, reason: "no-compose" };
  };

  if (state.trackedToken) {
    return { ok: false, reason: "already-tracked", message: state.trackedToken };
  };

  const { token, pixelUrl } = await PixelApi.create({
    subject: state.subject,
    recipientCount: state.recipientCount,
  });

  const injected = await askContentScript<InjectPixelResult>(tab.id, {
    type: INJECT_PIXEL,
    payload: { token, pixelUrl },
  });

  if (!injected?.ok) {
    return { ok: false, reason: injected?.reason ?? "content-unreachable" };
  };

  return { ok: true, token };
};

export default defineBackground(() => {
  browser.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message?.type) {
      case OPEN_SIGN_IN_MESSAGE:
        browser.tabs.create({
          url: `${API_BASE_URL}/auth/google/login`,
          active: true,
        });
        return sendResponse({ ok: true });

        //used: true
      case GET_COMPOSE_STATE: {
        void (async () => {
          const tab = await activeTab();
          const state = tab?.id !== undefined && isGmailUrl(tab.url)
            ? await askContentScript<ComposeState>(tab.id, { type: GET_COMPOSE_STATE })
            : null;

          sendResponse(state ?? { supported: false, hasCompose: false, recipientCount: 0 });
        })();

        return true;
      }

      case TRACK_EMAIL: {
        void (async () => {
          try {
            sendResponse(await trackActiveEmail());
          } catch (error) {
            if (error instanceof apiClientError && error.status === 401) {
              sendResponse({ ok: false, reason: "unauthenticated" });
              return;
            };

            console.error("[background] track email failed:", error);

            sendResponse({
              ok: false,
              reason: "server-error",
              message: error instanceof Error ? error.message : "unknown",
            });
          }
        })();

        return true;
      }
    }
  });
});
