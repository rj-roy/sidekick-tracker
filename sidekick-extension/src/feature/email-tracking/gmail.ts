import { EDITOR_SELECTOR, PIXEL_ATTRIBUTE, SUBJECT_SELECTOR } from "./selector";
import type { ComposeState, InjectPixelPayload, InjectPixelResult } from "./types";

let lastFocusedEditor: HTMLElement | null = null;

const isVisible = (el: HTMLElement): boolean => el.getClientRects().length > 0;

const escapeAttribute = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const composeRoot = (editor: HTMLElement): HTMLElement =>
  editor.closest<HTMLElement>('div[role="dialog"], div.adn.ao3') ?? editor;

const getEditors = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(EDITOR_SELECTOR)).filter(isVisible);

const activeEditor = (): HTMLElement | null => {
  const editors = getEditors();

  if (editors.length === 0) {
    return null;
  };

  const focused = document.activeElement;
  const focusedEditor = focused instanceof HTMLElement
    ? focused.closest<HTMLElement>(EDITOR_SELECTOR)
    : null;

  if (focusedEditor && editors.includes(focusedEditor)) {
    return focusedEditor;
  };

  if (lastFocusedEditor && editors.includes(lastFocusedEditor)) {
    return lastFocusedEditor;
  };

  return editors[editors.length - 1] ?? null;
};

export const initGmailListeners = (): void => {
  document.addEventListener("focusin", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    };

    const editor = target.closest<HTMLElement>(EDITOR_SELECTOR);

    if (editor && isVisible(editor)) {
      lastFocusedEditor = editor;
    };
  }, true);
};

export const getComposeState = (): ComposeState => {
  const editor = activeEditor();

  if (!editor) {
    return { supported: true, hasCompose: false, recipientCount: 0 };
  };

  const root = composeRoot(editor);
  const subjectInput = root.querySelector<HTMLInputElement>(SUBJECT_SELECTOR)
    ?? document.querySelector<HTMLInputElement>(SUBJECT_SELECTOR);

  const trackedToken = editor
    .querySelector(`img[${PIXEL_ATTRIBUTE}]`)
    ?.getAttribute(PIXEL_ATTRIBUTE);

  return {
    supported: true,
    hasCompose: true,
    recipientCount: root.querySelectorAll("span[email]").length,
    ...(subjectInput?.value ? { subject: subjectInput.value } : {}),
    ...(trackedToken ? { trackedToken } : {}),
  };
};

const placeCaretAtEnd = (editor: HTMLElement): void => {
  editor.focus();

  const selection = window.getSelection();

  if (!selection) {
    return;
  };

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);

  selection.removeAllRanges();
  selection.addRange(range);
};

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
  img.setAttribute(PIXEL_ATTRIBUTE, payload.token);

  editor.appendChild(img);
  editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" }));
};

export const injectPixel = (payload: InjectPixelPayload): InjectPixelResult => {
  const editor = activeEditor();

  if (!editor) {
    return { ok: false, reason: "no-compose" };
  };

  if (editor.querySelector(`img[${PIXEL_ATTRIBUTE}]`)) {
    return { ok: false, reason: "already-tracked" };
  };

  const html = `<img src="${escapeAttribute(payload.pixelUrl)}" width="1" height="1" alt="" ${PIXEL_ATTRIBUTE}="${escapeAttribute(payload.token)}">`;

  if (!insertWithExecCommand(editor, html)) {
    insertWithDom(editor, payload);
  };

  const injected = !!editor.querySelector(`img[${PIXEL_ATTRIBUTE}="${payload.token}"]`);

  return injected ? { ok: true } : { ok: false, reason: "content-unreachable" };
};
