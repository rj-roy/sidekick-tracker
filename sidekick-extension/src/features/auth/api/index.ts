import { apiClient } from "../../../shared/api";
import { OPEN_SIGN_IN_MESSAGE, SESSION_STORAGE_KEY } from "../../../shared/constants/api";
import type { User } from "../types";

export const authApi = {
  async me(): Promise<User> {
    const data = await apiClient.get<{ user: User; }>("/auth/me");
    return data.user;
  },

  async login(): Promise<void> {
    await chrome.runtime.sendMessage({ type: OPEN_SIGN_IN_MESSAGE });
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post<void>("/auth/logout");
    } finally {
      await chrome.storage.local.remove(SESSION_STORAGE_KEY);
    }
  },
};
