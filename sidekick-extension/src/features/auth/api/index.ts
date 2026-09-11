import { apiClient } from "../../../shared/api";
import { OPEN_SIGN_IN_MESSAGE } from "../../../shared/constants/api";
import { ApiClientError } from "../../../shared/utils/errorHandler";
import type { User } from "../types";

const AUTH_USER_KEY = "authUser";

export const authApi = {
  async me(): Promise<User> {
    try {
      const data = await apiClient.get<{ user: User }>("/auth/me");
      await chrome.storage.local.set({ [AUTH_USER_KEY]: data.user });
      return data.user;
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        await chrome.storage.local.remove(AUTH_USER_KEY);
      }
      throw err;
    }
  },

  async login(): Promise<void> {
    await chrome.runtime.sendMessage({ type: OPEN_SIGN_IN_MESSAGE });
  },

  logout(): Promise<void> {
    return apiClient.post<void>("/auth/logout");
  },
};