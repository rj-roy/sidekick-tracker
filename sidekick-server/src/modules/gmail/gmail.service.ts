import type { ObjectId } from "mongodb";
import { ApiError } from "../../utils/ApiError.js";
import { env } from "../../config/env.js";
import { GoogleOAuthService } from "../google-accounts/google-oauth.service.js";
import type { GmailMessage, GmailMessageList, GmailProfile } from "./gmail.types.js";

const gmailFetch = async <T>(userId: ObjectId, path: string): Promise<T> => {
  const token = await GoogleOAuthService.getValidAccessToken(userId);

  const response = await fetch(`${env.google.gmailApiUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 || response.status === 403) {
    throw new ApiError(401, "Google authorization failed");
  }

  if (response.status === 404) {
    throw new ApiError(404, "Gmail resource not found");
  }

  if (!response.ok) {
    throw new ApiError(502, "Google upstream error");
  }

  const data: unknown = await response.json();

  if (!data || typeof data !== "object") {
    throw new ApiError(502, "Malformed response from Gmail");
  }

  return data as T;
};

export const GmailService = {
  async getProfile(userId: ObjectId): Promise<GmailProfile> {
    return gmailFetch<GmailProfile>(userId, "/profile");
  },

  async listMessages(
    userId: ObjectId,
    options?: { maxResults?: number; pageToken?: string; query?: string }
  ): Promise<GmailMessageList> {
    const params = new URLSearchParams();
    if (options?.maxResults) params.set("maxResults", String(options.maxResults));
    if (options?.pageToken) params.set("pageToken", options.pageToken);
    if (options?.query) params.set("q", options.query);

    const query = params.toString();
    return gmailFetch<GmailMessageList>(userId, `/messages${query ? `?${query}` : ""}`);
  },

  async getMessage(
    userId: ObjectId,
    messageId: string,
    format: "full" | "metadata" | "minimal" | "raw" = "full"
  ): Promise<GmailMessage> {
    return gmailFetch<GmailMessage>(
      userId,
      `/messages/${encodeURIComponent(messageId)}?format=${format}`
    );
  },
};