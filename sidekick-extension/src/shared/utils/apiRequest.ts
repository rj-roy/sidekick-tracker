import { API_BASE_URL, CSRF_STORAGE_KEY, SESSION_STORAGE_KEY } from "../constants/api";
import { ApiEnvelope } from "../types/api";
import { ApiClientError } from "./errorHandler";

const sessionGet = async (keys: string[]): Promise<Record<string, unknown>> => {
  if (chrome.storage?.session) {
    return chrome.storage.session.get(keys);
  }
  return chrome.storage.local.get(keys);
};

const sessionSet = async (values: Record<string, unknown>): Promise<void> => {
  if (chrome.storage?.session) {
    await chrome.storage.session.set(values);
  } else {
    await chrome.storage.local.set(values);
  }
};

export const apiRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const stored = await sessionGet([SESSION_STORAGE_KEY, CSRF_STORAGE_KEY]);
  const token = stored[SESSION_STORAGE_KEY] as string | undefined;
  const csrfToken = stored[CSRF_STORAGE_KEY] as string | undefined;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
    },
    ...init,
  });

  const rotatedCsrf = res.headers.get("x-csrf-token");
  if (rotatedCsrf) {
    await sessionSet({ [CSRF_STORAGE_KEY]: rotatedCsrf });
  }

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok) {
    throw new ApiClientError(res.status, body?.message ?? "Request failed");
  }

  return body!.data as T;
};