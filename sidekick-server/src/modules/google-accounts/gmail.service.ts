import type { ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { GoogleOAuthService } from "./google-oauth.service.js";
import type { GmailProfile, GmailMessageList, GmailMessage } from "./gmail.types.js";

const mailApiFetch = async <T>(path: string, accessToken: string): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${env.google.gmailApiUrl}/gmail/v1/users/me${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new ApiError(502, "Unable to reach Gmail");
  };

  switch (response.status) {
    case 401:
    case 403:
      throw new ApiError(401, "Gmail authorization failed");

    case 404:
      throw new ApiError(404, "Gmail resource not found");

    case 429:
      throw new ApiError(429, "Gmail rate limit exceeded");
  };

  if (!response.ok) {
    throw new ApiError(502, "Gmail upstream error");
  }

  return response.json() as Promise<T>;
};

export const GmailService = {
  async getProfile(userId: ObjectId): Promise<GmailProfile> {
    const accessToken = await GoogleOAuthService.getAccessToken(userId);
    const data: unknown = await mailApiFetch("/profile", accessToken);

    if (!data || typeof data !== "object" || typeof (data as GmailProfile).emailAddress !== "string") {
      throw new ApiError(502, "Malformed response from Gmail");
    }

    return data as GmailProfile;
  },

  async listMessages(userId: ObjectId, query?: string, maxResults = 50): Promise<GmailMessageList> {
    const accessToken = await GoogleOAuthService.getAccessToken(userId);
    const params = new URLSearchParams({ maxResults: String(maxResults) });
    if (query) {
      params.set("q", query);
    }

    const data: unknown = await mailApiFetch(`/messages?${params.toString()}`, accessToken);

    if (!data || typeof data !== "object" || typeof (data as GmailMessageList).resultSizeEstimate !== "number") {
      throw new ApiError(502, "Malformed response from Gmail");
    }

    return data as GmailMessageList;
  },

  async getMessage(userId: ObjectId, messageId: string, format: "full" | "metadata" | "minimal" = "full"): Promise<GmailMessage> {
    const accessToken = await GoogleOAuthService.getAccessToken(userId);
    const data: unknown = await mailApiFetch(
      `/messages/${encodeURIComponent(messageId)}?format=${format}`,
      accessToken
    );

    if (!data || typeof data !== "object" || typeof (data as GmailMessage).id !== "string") {
      throw new ApiError(502, "Malformed response from Gmail");
    }

    return data as GmailMessage;
  },
};