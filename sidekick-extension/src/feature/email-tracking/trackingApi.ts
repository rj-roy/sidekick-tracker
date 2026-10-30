import { apiClient } from "@/shared/api/client";
import type { EmailSentPayload, PixelCredential } from "./TrackingTypes";

export const PixelApi = {
  async create(payload: { status: string }): Promise<PixelCredential> {
    return await apiClient.post<PixelCredential>("/api/pixel/create", payload);
  },
};

export const MailApi = {
  async markSent(payload: EmailSentPayload): Promise<void> {
    await apiClient.post("/api/tracking/sent", payload);
  },
};