export const sessionGet = async <T>(keys: string[]): Promise<Record<string, T | undefined>> => {
  if (chrome.storage?.session) {
    return chrome.storage.session.get(keys) as Promise<Record<string, T | undefined>>;
  }
  return chrome.storage.local.get(keys) as Promise<Record<string, T | undefined>>;
};

export const sessionSet = async (values: Record<string, unknown>): Promise<void> => {
  if (chrome.storage?.session) {
    await chrome.storage.session.set(values);
  } else {
    await chrome.storage.local.set(values);
  }
};

export const sessionRemove = async (keys: string[]): Promise<void> => {
  if (chrome.storage?.session) {
    await chrome.storage.session.remove(keys);
  } else {
    await chrome.storage.local.remove(keys);
  }
};