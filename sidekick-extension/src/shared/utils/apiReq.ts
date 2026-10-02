import { API_BASE_URL } from "../constants/api";
import type { ApiRes } from "../types/ApiTypes";
import { apiClientError } from "./apiClientError";

const isStorageKeyLive = (): void => {
  if (!browser.storage?.session) {
    throw new Error("chrome.storage.session is not available in this browser");
  }
};

const getTokens = async (keys: string[]): Promise<Record<string, unknown>> => {
  isStorageKeyLive();
  return browser.storage.session.get(keys);
};

const updateTokens = async (values: Record<string, unknown>): Promise<void> => {
  isStorageKeyLive();
  await browser.storage.session.set(values);
};

export const apiReq = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const extensionId = browser.runtime.id;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-extension-id": extensionId,
      "x-client-type": "extension",
      ...(init?.headers ?? {}),
    },
  });

  console.log(res);

  const body = (await res.json().catch(() => null)) as ApiRes<T> | null;

  if (!res.ok || !body?.success) {
    throw new apiClientError(res.status, body?.message ?? "Request failed");
  };

  return body!.data as T;
};