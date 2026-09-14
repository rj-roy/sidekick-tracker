export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessagePayload {
  headers?: GmailMessageHeader[];
  body?: { size?: number; data?: string; attachmentId?: string };
  mimeType?: string;
  parts?: GmailMessagePayload[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: GmailMessagePayload;
  sizeEstimate?: number;
}

export interface GmailMessageList {
  messages?: Pick<GmailMessage, "id" | "threadId">[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}