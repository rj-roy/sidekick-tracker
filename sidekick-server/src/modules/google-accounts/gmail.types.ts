export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
}

export interface GmailMessageList {
  messages?: GmailMessageSummary[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  sizeEstimate?: number;
  internalDate?: string;
  payload?: {
    mimeType?: string;
    filename?: string;
    headers?: Array<{ name: string; value: string }>;
    body?: { size?: number; data?: string };
    parts?: unknown[];
  };
}