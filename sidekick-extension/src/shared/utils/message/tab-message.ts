import { injectContentScript, wait } from "./contentScript";

export const askContentScript = async <T>(
  tabId: number,
  message: unknown,
  option: { autoInject?: boolean; retries?: number; intervalMs?: number } = {},
): Promise<T | null> => {
  const { autoInject = true, retries = 3, intervalMs = 100 } = option;
  let injected = false;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await browser.tabs.sendMessage(tabId, message);
      if (res !== undefined) return res as T;
    } catch {
      // 
    }

    if (attempt === 0 && autoInject) {
      if (!(await injectContentScript(tabId))) return null;
      injected = true;
    } else if (attempt > 0) {
      await wait(intervalMs);
    }
  }

  return null;
};