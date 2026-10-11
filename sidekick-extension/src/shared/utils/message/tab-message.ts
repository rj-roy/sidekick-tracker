export const askContentScript = async <T>(tabId: number, message: unknown): Promise<T | null> => {
  try {
    return (await browser.tabs.sendMessage(tabId, message)) as T;
  } catch {
    return null;
  }
};