import { apiClient } from "@/shared/api/client";
import type { CreatePixelPayload, PixelCredential } from "./types";

export const PixelApi = {
  async create(payload: CreatePixelPayload = {}): Promise<PixelCredential> {
    return await apiClient.post<PixelCredential>("/api/pixel/create", payload);
  },
};
