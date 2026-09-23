import { API_BASE_URL } from "../constants/api";
import type { ApiRes } from "../types/apiTypes";
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
  const stored = await getTokens(["OG_L", "T_ls_"]);
  const sessionToken = stored["OG_L"] as string | undefined;
  const csrfToken = stored["T_ls_"] as string | undefined;
  const extensionId = browser.runtime.id;

  console.log(stored);
  console.log(sessionToken);
  console.log(csrfToken);
  console.log(extensionId);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-extension-id": extensionId,
      "x-client-type": "extension",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const rotatedToken = res.headers.get("x-r-session-token");
  if (rotatedToken) {
    await updateTokens({ OG_L: rotatedToken });
  };

  const rotatedCsrf = res.headers.get("x-r-csrf-token");
  if (rotatedCsrf) {
    await updateTokens({ T_ls_: rotatedCsrf });
  }

  const body = (await res.json().catch(() => null)) as ApiRes<T> | null;
  console.log(body, "body console");

  if (!res.ok || !body?.success) {
    throw new apiClientError(res.status, body?.message ?? "Request failed");
  };

  return body!.data as T;
};