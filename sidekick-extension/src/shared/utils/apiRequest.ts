import { API_BASE_URL } from "../constants/api";
import { ApiClientError } from "./errorHandler";
import { buildDeviceInfo } from "./device";
import { ApiEnvelope } from "../types/apiType";

export const apiRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const deviceInfo = await buildDeviceInfo().catch(() => null);

  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  if (deviceInfo) {
    headers.set("X-Device-Info", JSON.stringify(deviceInfo));
  }
  if ((init?.method ?? "GET").toUpperCase() !== "GET") {
    headers.set("X-Requested-With", "XMLHttpRequest");
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok) {
    throw new ApiClientError(res.status, body?.message ?? "Request failed");
  }

  return body!.data as T;
};