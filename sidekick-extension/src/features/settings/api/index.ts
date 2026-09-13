import { apiClient } from "../../../shared/api";
import type { GoogleAccountResponse } from "../types";

export const settingsApi = {
  async getAccount(): Promise<GoogleAccountResponse> {
    return apiClient.get<GoogleAccountResponse>("/google-accounts");
  },

  async refreshToken(): Promise<GoogleAccountResponse> {
    return apiClient.post<GoogleAccountResponse>("/google-accounts/refresh");
  },

  async disconnect(): Promise<void> {
    return apiClient.delete<void>("/google-accounts");
  },
};