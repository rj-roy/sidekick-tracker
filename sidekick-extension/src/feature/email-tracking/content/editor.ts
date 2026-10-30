import { EDITOR_SELECTOR } from "./selectors";

let lastFocusedEditor: HTMLElement | null = null;

const isVisible = (el: HTMLElement): boolean => el.getClientRects().length > 0;

export const getEditors = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>(EDITOR_SELECTOR)).filter(isVisible);

export const activeEditor = (): HTMLElement | null => {
    const editors = getEditors();
    if (editors.length === 0) return null;

    const focused = document.activeElement;
    const focusedEditor = focused instanceof HTMLElement
        ? focused.closest<HTMLElement>(EDITOR_SELECTOR)
        : null;

    if (focusedEditor && editors.includes(focusedEditor)) return focusedEditor;
    if (lastFocusedEditor && editors.includes(lastFocusedEditor)) return lastFocusedEditor;

    return editors[editors.length - 1] ?? null;
};

export const placeCaretAtEnd = (editor: HTMLElement): void => {
    editor.focus();
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);

    selection.removeAllRanges();
    selection.addRange(range);
};

export const initEditorTracking = (): void => {
    document.addEventListener("focusin", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const editor = target.closest<HTMLElement>(EDITOR_SELECTOR);
        if (editor && isVisible(editor)) lastFocusedEditor = editor;
    }, true);
};