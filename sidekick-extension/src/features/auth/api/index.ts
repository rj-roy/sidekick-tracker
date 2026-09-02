import { apiClient } from "../../../shared/api";
import { OPEN_SIGN_IN_MESSAGE } from "../../../shared/constants/api";
import type { User } from "../types";

export const authApi = {
  me(): Promise<User> {
    return apiClient.get<{ user: User }>("/api/auth/me").then((data) => data.user);
  },

  async login(): Promise<void> {
    await chrome.runtime.sendMessage({ type: OPEN_SIGN_IN_MESSAGE });
  },

  logout(): Promise<void> {
    return apiClient.post<void>("/api/auth/logout");
  },
};
