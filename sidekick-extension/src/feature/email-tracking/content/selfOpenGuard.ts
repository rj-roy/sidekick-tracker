import { EDITOR_SELECTOR } from "./selectors";

const TRACK_SRC = /\/api\/track\/[A-Za-z0-9_-]{43}\.gif/i;

const neutralize = (img: HTMLImageElement): void => {
    if (img.dataset.sidekickNeutralized) return;
    // never touch the composer (that pixel must be sent)
    if (img.closest(EDITOR_SELECTOR)) return;
    if (!TRACK_SRC.test(img.currentSrc || img.src || "")) return;

    img.dataset.sidekickNeutralized = "1";
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
};

const sweep = (root: ParentNode): void => {
    root.querySelectorAll<HTMLImageElement>("img").forEach(neutralize);
};

export const initSelfOpenGuard = (): void => {
    sweep(document);
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            m.addedNodes.forEach((node) => {
                if (node instanceof HTMLImageElement) neutralize(node);
                else if (node instanceof HTMLElement) sweep(node);
            });
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
};
