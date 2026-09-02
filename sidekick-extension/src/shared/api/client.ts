import { apiRequest } from "../utils/apiRequest";

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return apiRequest<T>(path);
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return apiRequest<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },

  delete<T>(path: string): Promise<T> {
    return apiRequest<T>(path, { method: "DELETE" });
  },
};
