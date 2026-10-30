import type { EMAIL_SENT, GET_COMPOSE_STATE, INJECT_PIXEL } from "@/shared/constants/api";

export interface PixelCredential {
  trackingToken: string;
  pixelUrl: string;
  messageId: string;
};

// export interface CreatePixelPayload {
//   subject: string;
//   recipientCount: number;
//   recipient: string[];
//   status: string;
// }

export interface ComposeState {
  supported: boolean;
  hasCompose: boolean;
  recipientCount: number;
  recipient: string[];
  subject?: string;
  trackedToken?: string;
}

export type TrackFailure =
  | "no-gmail-tab"
  | "no-compose"
  | "already-tracked"
  | "content-unreachable"
  | "unauthenticated"
  | "server-error";

export type TrackResult =
  | { ok: true; trackingToken: string }
  | { ok: false; reason: TrackFailure; message?: string };

export interface InjectPixelPayload extends PixelCredential {
  subject: string;
  messageId: string;
}

export type InjectPixelResult = { ok: true } | { ok: false; reason: TrackFailure }

export interface TrackedDraft {
  id: string;
  trackingToken: string;
  recipient: string[];
  subject: string;
  status: "draft" | "sent" | "opened";
  updatedAt: number;
};

export type CardState =
  | { status: "checking" }
  | { status: "idle"; compose: ComposeState }
  | { status: "working" }
  | { status: "tracked"; trackingToken: string }
  | { status: "error"; message: string };

export interface EmailSentPayload {
  trackingToken: string;
  subject: string;
  recipient: string[];
  sentAt: number;
};

export interface MarkSentResult {
  ok: boolean;
  reason?: "unauthenticated" | "server-error";
};


export type GetComposeStateMessage = { type: typeof GET_COMPOSE_STATE };

export type InjectPixelMessage = {
  type: typeof INJECT_PIXEL;
  payload: InjectPixelPayload
};

export type EmailSentMessage = {
  type: typeof EMAIL_SENT;
  trackingToken: string;
  subject: string;
  sentAt: number;
  recipient: string[];
};

export type ContentMessage = GetComposeStateMessage | InjectPixelMessage;
export type BackgroundMessage = EmailSentMessage;

export type GetComposeStateResponse = ComposeState;
export type InjectPixelResponse = InjectPixelResult;