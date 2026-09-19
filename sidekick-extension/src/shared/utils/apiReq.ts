import { API_BASE_URL, CS_STORAGE, SESSION_STORAGE } from "@/shared/constants/api";
import type { ApiEnvelope } from "../types/apiTypes";
import { apiClientError } from "./apiClientError";

export const apiReq = async <T>(path: string): Promise<T> => {

  if (!browser.storage?.session) {
    throw new Error("Invalid session storage!");
  };

  const sessinToken = await browser.storage.session.get(SESSION_STORAGE) as string;
  const csrfToken = await browser.storage.session.get(CS_STORAGE) as string;

  // if(!csrfToken)

  const res = await fetch(`${API_BASE_URL}${path}`);
  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> || null;


  if (!res.ok) {
    throw new apiClientError(res.status, body?.message ?? "Request failed");
  };

  return body!.data as T;
};