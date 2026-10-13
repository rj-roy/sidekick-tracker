const SENT_KEY_PREFIX = "sent:";

export const inFlightSends = new Set<string>();

export const sessionKey = (trackingToken: string): string => `${SENT_KEY_PREFIX}${trackingToken}`;

export const alreadySent = async (trackingToken: string): Promise<boolean> => {
  if (inFlightSends.has(trackingToken)) return true;
  const key = sessionKey(trackingToken);
  const stored = (await browser.storage.session.get(key)) as Record<string, unknown>;
  return Boolean(stored[key]);
};