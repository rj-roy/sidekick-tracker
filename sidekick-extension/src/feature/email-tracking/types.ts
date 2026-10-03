export interface PixelCredential {
  token: string;
  pixelUrl: string;
}

export interface CreatePixelPayload {
  subject?: string;
  recipientCount?: number;
}

export interface ComposeState {
  supported: boolean;
  hasCompose: boolean;
  recipientCount: number;
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
  | { ok: true; token: string }
  | { ok: false; reason: TrackFailure; message?: string };

export interface InjectPixelPayload extends PixelCredential {}

export type InjectPixelResult = { ok: true } | { ok: false; reason: TrackFailure };
