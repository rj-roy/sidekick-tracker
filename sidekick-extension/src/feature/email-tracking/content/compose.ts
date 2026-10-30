import type { ComposeState } from "../TrackingTypes";
import { activeEditor } from "./editor";
import {
    COMPOSE_ROOT_SELECTOR,
    PIXEL_ATTRIBUTE,
    RECIPIENT_SELECTOR,
    SUBJECT_SELECTOR,
} from "./selectors";

const tokenFromPixelSrc = (img: HTMLImageElement): string | null => {
    const src = img.currentSrc || img.src || img.getAttribute("src") || "";
    return src.match(/\/api\/track\/([^/?#]+)\.gif(?:[?#].*)?$/)?.[1] ?? null;
};

export const composeRoot = (editor: HTMLElement): HTMLElement =>
    editor.closest<HTMLElement>(COMPOSE_ROOT_SELECTOR) ?? editor;

export const subjectFromCompose = (root: HTMLElement | null): string =>
    root?.querySelector<HTMLInputElement>(SUBJECT_SELECTOR)?.value ?? "";

export const tokenFromEditor = (editor: HTMLElement | null): string | null => {
    if (!editor) return null;

    const imgs = Array.from(editor.querySelectorAll<HTMLImageElement>("img"));
    for (const img of imgs) {
        const trackingToken = img.getAttribute(PIXEL_ATTRIBUTE) ?? tokenFromPixelSrc(img);
        if (trackingToken) return trackingToken;
    };

    return null;
};

export const getComposeState = (): ComposeState => {
    const editor = activeEditor();
    if (!editor) return { supported: true, hasCompose: false, recipientCount: 0, recipient: [] };

    const root = composeRoot(editor);
    const subjectInput = root.querySelector<HTMLInputElement>(SUBJECT_SELECTOR)
        ?? document.querySelector<HTMLInputElement>(SUBJECT_SELECTOR);

    const trackedToken = tokenFromEditor(editor);
    const recipient = recipientsFromCompose(root);

    return {
        supported: true,
        hasCompose: true,
        recipientCount: recipient.length,
        recipient,
        ...(subjectInput?.value ? { subject: subjectInput.value } : {}),
        ...(trackedToken ? { trackedToken } : {}),
    };
};

export const recipientsFromCompose = (root: HTMLElement | null): string[] => {
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(RECIPIENT_SELECTOR))
        .map((el) => el.getAttribute("email")?.trim().toLowerCase() ?? "")
        .filter((value, index, all) => value.length > 0 && all.indexOf(value) === index);
};