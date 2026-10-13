import { COMPOSE_ROOT_SELECTOR, EDITOR_SELECTOR, SEND_BUTTON_SELECTOR } from "./selectors";
import { composeRoot, recipientsFromCompose, subjectFromCompose, tokenFromEditor } from "./compose";
import { notifyEmailSent } from "@/shared/utils/message/trackingMessages";

export type PendingSend = { trackingToken: string; subject: string; at: number; recipient: string[] };

const SEND_WINDOW_MS = 60_000;
let pendingSends: PendingSend[] = [];
let initialized = false;

const record = (intent: PendingSend | null): void => {
    if (!intent) return;
    pendingSends = [...pendingSends.filter((p) => p.trackingToken !== intent.trackingToken), intent];
};

const sendIntentFromClick = (event: Event): PendingSend | null => {
    if (!(event.target instanceof HTMLElement)) return null;
    const button = event.target.closest<HTMLElement>(SEND_BUTTON_SELECTOR);
    if (!button) return null;
    const root = button.closest<HTMLElement>(COMPOSE_ROOT_SELECTOR);
    const editor = root?.querySelector<HTMLElement>(EDITOR_SELECTOR) ?? null;
    const trackingToken = tokenFromEditor(editor);
    return trackingToken
        ? { trackingToken, subject: subjectFromCompose(root), recipient: recipientsFromCompose(root), at: Date.now() }
        : null;
};

const sendIntentFromKey = (event: KeyboardEvent): PendingSend | null => {
    if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return null;
    if (!(event.target instanceof HTMLElement)) return null;
    const editor = event.target.closest<HTMLElement>(EDITOR_SELECTOR);
    if (!editor) return null;
    const trackingToken = tokenFromEditor(editor);
    const root = composeRoot(editor);
    return trackingToken
        ? { trackingToken, subject: subjectFromCompose(root), recipient: recipientsFromCompose(root), at: Date.now() }
        : null;
};

export const prunePendingSends = (): void => {
    const cutoff = Date.now() - SEND_WINDOW_MS;
    pendingSends = pendingSends.filter((p) => p.at >= cutoff);
};

export const flushPendingSends = (tokens: Set<string>): void => {
    if (tokens.size === 0) return;

    const sent = new Map<string, PendingSend>();
    for (const p of pendingSends) {
        if (tokens.has(p.trackingToken)) sent.set(p.trackingToken, p);
    };

    pendingSends = pendingSends.filter((p) => !tokens.has(p.trackingToken));

    for (const p of sent.values()) {
        notifyEmailSent({
            trackingToken: p.trackingToken,
            subject: p.subject,
            recipient: p.recipient,
            sentAt: Date.now(),
        });
    }
};

export const initSendDetection = (): void => {
    if (initialized) return;
    initialized = true;
    document.addEventListener("click", (event) => record(sendIntentFromClick(event)), true);
    document.addEventListener("keydown", (event) => record(sendIntentFromKey(event)), true);
};