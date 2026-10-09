import { defineContentScript } from '#imports';
import { getComposeState, initGmailListeners, injectPixel } from "@/feature/email-tracking/gmail";
import { GET_COMPOSE_STATE, INJECT_PIXEL } from '@/shared/constants/api';
import type { InjectPixelPayload } from '@/shared/types/TrackingTypes';

export default defineContentScript({
  matches: ['<all_urls>'],

  main(ctx) {
    initGmailListeners();

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
