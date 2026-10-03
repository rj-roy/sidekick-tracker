import { getComposeState, initGmailListeners, injectPixel } from "@/feature/email-tracking/gmail";
import { GET_COMPOSE_STATE, INJECT_PIXEL } from "@/feature/email-tracking/messages";
import type { InjectPixelPayload } from "@/feature/email-tracking/types";

export default defineContentScript({
  matches: ["https://mail.google.com/*"],

  main() {
    initGmailListeners();

    //used: true
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message?.type) {
        case GET_COMPOSE_STATE:
          sendResponse(getComposeState());
          return;

        case INJECT_PIXEL:
          sendResponse(injectPixel(message.payload as InjectPixelPayload));
          return;
      }
    });
  },
});
