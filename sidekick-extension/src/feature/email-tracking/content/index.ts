import { observeComposeRemoval, tokensFromRemoved } from "./domObserver";
import { initEditorTracking } from "./editor";
import { initSelfOpenGuard } from "./selfOpenGuard";
import { flushPendingSends, initSendDetection, prunePendingSends } from "./sentDetector";

export { getComposeState } from "./compose";
export { injectPixel } from "./pixel";

export const initGmailListeners = (): void => {
  initSelfOpenGuard();
  initEditorTracking();
  initSendDetection();

  observeComposeRemoval((node) => {
    prunePendingSends();
    flushPendingSends(tokensFromRemoved(node));
  });
};