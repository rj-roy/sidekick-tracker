// import type { ComposeState, InjectPixelPayload, InjectPixelResult } from "@/feature/email-tracking/TrackingTypes";
// import { EDITOR_SELECTOR, PIXEL_ATTRIBUTE, SUBJECT_SELECTOR } from "./selector";

// let lastFocusedEditor: HTMLElement | null = null;

// const isVisible = (el: HTMLElement): boolean => el.getClientRects().length > 0;

// const escapeAttribute = (value: string): string =>
//   value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// const composeRoot = (editor: HTMLElement): HTMLElement =>
//   editor.closest<HTMLElement>('div[role="dialog"], div.adn.ao3') ?? editor;

// const getEditors = (): HTMLElement[] =>
//   Array.from(document.querySelectorAll<HTMLElement>(EDITOR_SELECTOR)).filter(isVisible);

// const activeEditor = (): HTMLElement | null => {
//   const editors = getEditors();

//   if (editors.length === 0) {
//     return null;
//   };

//   const focused = document.activeElement;
//   const focusedEditor = focused instanceof HTMLElement
//     ? focused.closest<HTMLElement>(EDITOR_SELECTOR)
//     : null;

//   if (focusedEditor && editors.includes(focusedEditor)) {
//     return focusedEditor;
//   };

//   if (lastFocusedEditor && editors.includes(lastFocusedEditor)) {
//     return lastFocusedEditor;
//   };

//   return editors[editors.length - 1] ?? null;
// };

// const placeCaretAtEnd = (editor: HTMLElement): void => {
//   editor.focus();

//   const selection = window.getSelection();

//   if (!selection) {
//     return;
//   };

//   const range = document.createRange();
//   range.selectNodeContents(editor);
//   range.collapse(false);

//   selection.removeAllRanges();
//   selection.addRange(range);
// };

// const insertWithExecCommand = (editor: HTMLElement, html: string): boolean => {
//   placeCaretAtEnd(editor);

//   try {
//     return document.execCommand("insertHTML", false, html);
//   } catch {
//     return false;
//   }
// };

// const insertWithDom = (editor: HTMLElement, payload: InjectPixelPayload): void => {
//   const img = document.createElement("img");
//   img.src = payload.pixelUrl;
//   img.width = 1;
//   img.height = 1;
//   img.alt = "";
//   img.setAttribute(PIXEL_ATTRIBUTE, payload.trackingToken);

//   editor.appendChild(img);
//   editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" }));
// };

// import { EMAIL_SENT } from "@/shared/constants/api";

// type PendingSend = { token: string; subject: string; at: number };

// let pendingSends: PendingSend[] = [];

// const SEND_BUTTON_SELECTOR =
//   'div[role="button"][data-tooltip^="Send"], div[role="button"][aria-label^="Send"]';
// const COMPOSE_ROOT_SELECTOR = 'div[role="dialog"], div.adn.ao3';
// const SEND_WINDOW_MS = 60_000;

// const tokenFromEditor = (editor: HTMLElement | null): string | null =>
//   editor?.querySelector(`img[${PIXEL_ATTRIBUTE}]`)?.getAttribute(PIXEL_ATTRIBUTE) ?? null;

// const subjectFromCompose = (root: HTMLElement | null): string =>
//   root?.querySelector<HTMLInputElement>(SUBJECT_SELECTOR)?.value ?? "";

// const sendIntentFromClick = (event: Event): PendingSend | null => {
//   if (!(event.target instanceof HTMLElement)) return null;

//   const button = event.target.closest<HTMLElement>(SEND_BUTTON_SELECTOR);
//   if (!button) return null;

//   const root = button.closest<HTMLElement>(COMPOSE_ROOT_SELECTOR);
//   const editor = root?.querySelector<HTMLElement>(EDITOR_SELECTOR) ?? null;
//   const token = tokenFromEditor(editor);

//   return token ? { token, subject: subjectFromCompose(root), at: Date.now() } : null;
// };

// const sendIntentFromKey = (event: KeyboardEvent): PendingSend | null => {
//   if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return null;
//   if (!(event.target instanceof HTMLElement)) return null;

//   const editor = event.target.closest<HTMLElement>(EDITOR_SELECTOR);
//   const token = tokenFromEditor(editor);

//   return token
//     ? { token, subject: subjectFromCompose(composeRoot(editor!)), at: Date.now() }
//     : null;
// };

// const flushSentFromRemoved = (removed: Node): void => {
//   if (!(removed instanceof HTMLElement) && !(removed instanceof DocumentFragment)) return;

//   const tokens = new Set<string>();
//   removed.querySelectorAll?.(`img[${PIXEL_ATTRIBUTE}]`).forEach((img) => {
//     const token = img.getAttribute(PIXEL_ATTRIBUTE);
//     if (token) tokens.add(token);
//   });

//   if (removed instanceof HTMLElement) {
//     const own = removed.getAttribute(PIXEL_ATTRIBUTE);
//     if (own) tokens.add(own);
//   }

//   if (tokens.size === 0) return;

//   const [sent, rest] = [
//     pendingSends.filter((p) => tokens.has(p.token)),
//     pendingSends.filter((p) => !tokens.has(p.token)),
//   ];
//   pendingSends = rest;

//   for (const p of sent) {
//     void browser.runtime.sendMessage({
//       type: EMAIL_SENT,
//       token: p.token,
//       subject: p.subject,
//       sentAt: Date.now(),
//     });
//   }
// };

// const prunePendingSends = (): void => {
//   const cutoff = Date.now() - SEND_WINDOW_MS;
//   pendingSends = pendingSends.filter((p) => p.at >= cutoff);
// };

// const observeComposeRemoval = (): void => {
//   const observer = new MutationObserver((mutations) => {
//     prunePendingSends();

//     for (const mutation of mutations) {
//       mutation.removedNodes.forEach((node) => flushSentFromRemoved(node));
//     }
//   });

//   observer.observe(document.body, { childList: true, subtree: true });
// };

// export const injectPixel = (payload: InjectPixelPayload): InjectPixelResult => {
//   const editor = activeEditor();

//   if (!editor) {
//     return { ok: false, reason: "no-compose" };
//   };

//   if (editor.querySelector(`img[${PIXEL_ATTRIBUTE}]`)) {
//     return { ok: false, reason: "already-tracked" };
//   };

//   const html = `<img src="${escapeAttribute(payload.pixelUrl)}" width="1" height="1" alt="" ${PIXEL_ATTRIBUTE}="${escapeAttribute(payload.trackingToken)}">`;

//   if (!insertWithExecCommand(editor, html)) {
//     insertWithDom(editor, payload);
//   };

//   const injected = !!editor.querySelector(`img[${PIXEL_ATTRIBUTE}="${payload.trackingToken}"]`);

//   return injected ? { ok: true } : { ok: false, reason: "content-unreachable" };
// };

// export const initGmailListeners = (): void => {
//   document.addEventListener("focusin", (event) => {
//     const target = event.target;

//     if (!(target instanceof HTMLElement)) {
//       return;
//     };

//     const editor = target.closest<HTMLElement>(EDITOR_SELECTOR);

//     if (editor && isVisible(editor)) {
//       lastFocusedEditor = editor;
//     };
//   }, true);

//   document.addEventListener("click", (event) => {
//     const intent = sendIntentFromClick(event);
//     if (intent) pendingSends.push(intent);
//   }, true);

//   document.addEventListener("keydown", (event) => {
//     const intent = sendIntentFromKey(event);
//     if (intent) pendingSends.push(intent);
//   }, true);

//   observeComposeRemoval();
// };

// export const getComposeState = (): ComposeState => {
//   const editor = activeEditor();

//   if (!editor) {
//     return { supported: true, hasCompose: false, recipientCount: 0 };
//   };

//   const root = composeRoot(editor);
//   const subjectInput = root.querySelector<HTMLInputElement>(SUBJECT_SELECTOR)
//     ?? document.querySelector<HTMLInputElement>(SUBJECT_SELECTOR);

//   const trackedToken = editor
//     .querySelector(`img[${PIXEL_ATTRIBUTE}]`)
//     ?.getAttribute(PIXEL_ATTRIBUTE);

//   return {
//     supported: true,
//     hasCompose: true,
//     recipientCount: root.querySelectorAll("span[email]").length,
//     ...(subjectInput?.value ? { subject: subjectInput.value } : {}),
//     ...(trackedToken ? { trackedToken } : {}),
//   };
// };