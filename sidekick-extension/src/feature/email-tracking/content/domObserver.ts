import { PIXEL_ATTRIBUTE } from "./selectors";

export const tokensFromRemoved = (removed: Node): Set<string> => {
    const tokens = new Set<string>();
    if (!(removed instanceof HTMLElement) && !(removed instanceof DocumentFragment)) {
        return tokens;
    }

    removed.querySelectorAll?.(`img[${PIXEL_ATTRIBUTE}]`).forEach((img) => {
        const token = img.getAttribute(PIXEL_ATTRIBUTE);
        if (token) tokens.add(token);
    });

    if (removed instanceof HTMLElement) {
        const own = removed.getAttribute(PIXEL_ATTRIBUTE);
        if (own) tokens.add(own);
    }

    return tokens;
};

export const whenBodyReady = (callback: () => void): void => {
    if (document.body) {
        callback();
        return;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            if (document.body) callback();
        }, { once: true });
        return;
    }

    window.setTimeout(() => {
        if (document.body) callback();
    }, 0);
};

let observer: MutationObserver | null = null;

export const observeComposeRemoval = (onRemoved: (node: Node) => void): void => {
    if (observer) return;

    whenBodyReady(() => {
        if (observer || !document.body) return;

        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.removedNodes.forEach(onRemoved);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    });
};