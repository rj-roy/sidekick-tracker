import type { InjectPixelPayload, InjectPixelResult } from "../TrackingTypes";
import { activeEditor, placeCaretAtEnd } from "./editor";
import { PIXEL_ATTRIBUTE } from "./selectors";
import { tokenFromEditor } from "./compose";

const escapeAttribute = (value: string): string =>
    value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const insertWithExecCommand = (editor: HTMLElement, html: string): boolean => {
    placeCaretAtEnd(editor);
    try {
        return document.execCommand("insertHTML", false, html);
    } catch {
        return false;
    }
};

const insertWithDom = (editor: HTMLElement, payload: InjectPixelPayload): void => {
    const img = document.createElement("img");
    img.src = payload.pixelUrl;
    img.width = 1;
    img.height = 1;
    img.alt = "";
    img.setAttribute(PIXEL_ATTRIBUTE, payload.trackingToken);

    editor.appendChild(img);
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" }));
};

export const injectPixel = (payload: InjectPixelPayload): InjectPixelResult => {
    const editor = activeEditor();
    if (!editor) return { ok: false, reason: "no-compose" };
    if (tokenFromEditor(editor)) return { ok: false, reason: "already-tracked" };

    const html = `<img src="${escapeAttribute(payload.pixelUrl)}" width="1" height="1" alt="" ${PIXEL_ATTRIBUTE}="${escapeAttribute(payload.trackingToken)}">`;

    if (!insertWithExecCommand(editor, html)) insertWithDom(editor, payload);

    const injected = tokenFromEditor(editor) === payload.trackingToken;
    return injected ? { ok: true } : { ok: false, reason: "content-unreachable" };
};