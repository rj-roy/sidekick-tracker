import { API_BASE_URL, OPEN_SIGN_IN_MESSAGE } from "@/shared/constants/api";

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
    }
  });
});
