const requireSessionStorage = (): void => {
  if (!chrome.storage?.session) {
    throw new Error("chrome.storage.session is not available in this browser");
  }
};

export const sessionGet = async <T>(keys: string[]): Promise<Record<string, T | undefined>> => {
  requireSessionStorage();
  return chrome.storage.session.get(keys) as Promise<Record<string, T | undefined>>;
};

export const sessionSet = async (values: Record<string, unknown>): Promise<void> => {
  requireSessionStorage();
  await chrome.storage.session.set(values);
};

export const sessionRemove = async (keys: string[]): Promise<void> => {
  requireSessionStorage();
  await chrome.storage.session.remove(keys);
};