import { API_BASE_URL, EMAIL_SENT, GET_COMPOSE_STATE, isGmailUrl, OPEN_SIGN_IN_MESSAGE, TRACK_EMAIL } from "@/shared/constants/api";
import { apiClientError } from "@/shared/utils/apiClientError";
import type { ComposeState } from "@/feature/email-tracking/TrackingTypes";
import { askContentScript } from "@/shared/utils/message/tab-message";
import { activeTab, trackActiveEmail } from "@/feature/email-tracking/trackingService";
import { MailApi } from "@/feature/email-tracking/trackingApi";
import { updateDraftStatus } from "@/shared/utils/syncStore";
import { injectIntoOpenGmailTabs } from "@/shared/utils/message/contentScript";

export default defineBackground(() => {
  browser.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  });

  void injectIntoOpenGmailTabs();

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message?.type) {
      case OPEN_SIGN_IN_MESSAGE:
        browser.tabs.create({
          url: `${API_BASE_URL}/auth/google/login`,
          active: true,
        });
        return sendResponse({ ok: true });

      case GET_COMPOSE_STATE: {
        void (async () => {
          const tab = await activeTab();
          const state = tab?.id !== undefined && isGmailUrl(tab.url)
            ? await askContentScript<ComposeState>(tab.id, { type: GET_COMPOSE_STATE })
            : null;

          sendResponse(state ?? { supported: false, hasCompose: false, recipient: [], recipientCount: 0 });
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
            }

            console.error("[background] track email failed:", error);

            sendResponse({
              ok: false,
              reason: "server-error",
              message: error instanceof Error ? error.message : "unknown",
            });
          }
        })();

        return true;
      };

      case EMAIL_SENT: {
        void (async () => {
          const { trackingToken, subject, sentAt, recipient } = message as {
            trackingToken: string;
            subject?: string;
            sentAt?: number;
            recipient?: string[];
          };

          try {
            await updateDraftStatus(trackingToken, "sent");
            await MailApi.markSent({
              trackingToken,
              subject: subject ?? "",
              sentAt: sentAt ?? Date.now(),
              recipient: recipient ?? [],
            });

            sendResponse({ ok: true });
          } catch (error) {
            if (error instanceof apiClientError && error.status === 401) {
              sendResponse({ ok: false, reason: "unauthenticated" });
              return;
            }

            console.error("[background] mark sent failed:", error);
            sendResponse({ ok: false, reason: "server-error" });
          }
        })();

        return true;
      };

      case "REQUEST_HOST_PERMISSIONS":
        browser.permissions
          .request({ origins: message.origins })
          .then((granted) => sendResponse({ granted }))
          .catch(() => sendResponse({ granted: false }));
        return true;

      case "CHECK_HOST_PERMISSIONS":
        browser.permissions
          .contains({ origins: message.origins })
          .then((has) => sendResponse({ has }))
          .catch(() => sendResponse({ has: false }));
        return true;
    }
  });
});
