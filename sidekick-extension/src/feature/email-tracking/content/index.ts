import { observeComposeRemoval, tokensFromRemoved } from "./domObserver";
import { initEditorTracking } from "./editor";
import { flushPendingSends, initSendDetection, prunePendingSends } from "./sentDetector";

export { getComposeState } from "./compose";
export { injectPixel } from "./pixel";

export const initGmailListeners = (): void => {
  initEditorTracking();
  initSendDetection();

  observeComposeRemoval((node) => {
    prunePendingSends();
    flushPendingSends(tokensFromRemoved(node));
  });
};