import { apiClient } from "../../../shared/api";
import {
  CSRF_STORAGE_KEY,
  OPEN_SIGN_IN_MESSAGE,
  SESSION_STORAGE_KEY,
} from "../../../shared/constants/api";
import type { User } from "../types";

const storeCsrfToken = async (csrfToken?: string) => {
  if (csrfToken) {
    await chrome.storage.local.set({ [CSRF_STORAGE_KEY]: csrfToken });
  }
};

export const authApi = {
  async me(): Promise<User> {
    const data = await apiClient.get<{ user: User; csrfToken: string }>("/auth/me");
    await storeCsrfToken(data.csrfToken);
    return data.user;
  },

  async login(): Promise<void> {
    await chrome.runtime.sendMessage({ type: OPEN_SIGN_IN_MESSAGE });
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post<void>("/auth/logout");
    } finally {
      await chrome.storage.local.remove([SESSION_STORAGE_KEY, CSRF_STORAGE_KEY]);
    }
  },
};