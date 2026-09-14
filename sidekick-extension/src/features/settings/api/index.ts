import { apiClient } from "../../../shared/api";
import type { GoogleAccountResponse, SessionsResponse } from "../types";

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

  async listSessions(): Promise<SessionsResponse> {
    return apiClient.get<SessionsResponse>("/auth/sessions");
  },

  async revokeSession(sessionId: string): Promise<void> {
    return apiClient.delete<void>(`/auth/sessions/${sessionId}`);
  },

  async logoutAll(): Promise<void> {
    return apiClient.post<void>("/auth/logout-all");
  },
};