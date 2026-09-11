import { API_BASE_URL } from "../constants/api";
import { ApiEnvelope } from "../types/api";
import { ApiClientError } from "./errorHandler";

export const apiRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok) {
    throw new ApiClientError(res.status, body?.message ?? "Request failed");
  }

  return body!.data as T;
};
