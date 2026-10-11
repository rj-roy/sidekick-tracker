import { GET_COMPOSE_STATE, GMAIL_COMPOSE_URL, INJECT_PIXEL, isGmailUrl } from "@/shared/constants/api";
import type { ComposeState, InjectPixelResult, TrackResult } from "./TrackingTypes";
import { askContentScript } from "@/shared/utils/message/tab-message";
import { PixelApi } from "./trackingApi";
import { saveDraft } from "@/shared/utils/syncStore";

export const activeTab = async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
};

export const trackActiveEmail = async (): Promise<TrackResult> => {
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
  }

  if (state.trackedToken) {
    return { ok: true, trackingToken: state.trackedToken };
  };

  const { messageId, trackingToken, pixelUrl } = await PixelApi.create({ status: "draft" });

  const injected = await askContentScript<InjectPixelResult>(tab.id, {
    type: INJECT_PIXEL,
    payload: { trackingToken, pixelUrl, subject: state.subject },
  });

  if (!injected?.ok) {
    return { ok: false, reason: injected?.reason ?? "content-unreachable" };
  };

  void saveDraft({
    id: messageId,
    trackingToken: trackingToken,
    recipient: state.recipient ?? [],
    subject: state.subject ?? "",
    status: "draft",
    updatedAt: Date.now(),
  }).catch((error) => {
    console.error("[gmail] save draft failed:", error);
  });

  return { ok: true, trackingToken };
};