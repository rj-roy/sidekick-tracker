import { defineContentScript } from '#imports';
import { GET_COMPOSE_STATE, INJECT_PIXEL } from '@/shared/constants/api';
import type { InjectPixelPayload } from '@/feature/email-tracking/TrackingTypes';
import { getComposeState, initGmailListeners, injectPixel } from '@/feature/email-tracking/content';

declare global {
  interface Window {
    __sidekickContentStarted?: boolean;
  }
};

export default defineContentScript({
  matches: ['<all_urls>'],

  main(ctx) {
    if (window.__sidekickContentStarted) return;
    window.__sidekickContentStarted = true;

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