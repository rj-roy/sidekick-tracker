export const send = async <T,>(message: unknown): Promise<T | null> => {
  try {
    return (await browser.runtime.sendMessage(message)) as T;
  } catch {
    return null;
  }
};