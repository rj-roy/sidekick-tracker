import type { TrackedDraft } from "../../feature/email-tracking/TrackingTypes";

const DRAFTS_KEY = "trackedDrafts";

export const saveDraft = async (draft: TrackedDraft): Promise<void> => {
  const stored = (await browser.storage.sync.get(DRAFTS_KEY)) as { trackedDrafts?: TrackedDraft[] };
  const drafts = stored.trackedDrafts ?? [];

  const next = [...drafts.filter((d) => d.trackingToken !== draft.trackingToken), draft];

  await browser.storage.sync.set({ [DRAFTS_KEY]: next });
};

export const removeDraft = async (trackingToken: string): Promise<void> => {
  const { trackedDrafts = [] } = (await browser.storage.sync.get(DRAFTS_KEY)) as {
    trackedDrafts?: TrackedDraft[];
  };
  await browser.storage.sync.set({
    trackedDrafts: trackedDrafts.filter((d) => d.trackingToken !== trackingToken),
  });
};

export const updateDraftStatus = async (trackingToken: string, status: TrackedDraft["status"],):
  Promise<void> => {
  const { trackedDrafts = [] } = (await browser.storage.sync.get(DRAFTS_KEY)) as {
    trackedDrafts?: TrackedDraft[];
  };
  await browser.storage.sync.set({
    trackedDrafts: trackedDrafts.map((d) =>
      d.trackingToken === trackingToken ? { ...d, status } : d,
    ),
  });
};