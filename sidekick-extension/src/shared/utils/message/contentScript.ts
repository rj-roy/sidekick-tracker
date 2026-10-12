const CONTENT_SCRIPT_URL = "/content-scripts/content.js";

export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const injectContentScript = async (tabId: number): Promise<boolean> => {
    try {
        await browser.scripting.executeScript({
            target: { tabId },
            files: [CONTENT_SCRIPT_URL],
        });
        return true;
    } catch (error) {
        console.warn(`[sidekick] could not inject content script into tab ${tabId}`, error);
        return false;
    }
};

export const injectIntoOpenGmailTabs = async (): Promise<void> => {
    try {
        const tabs = await browser.tabs.query({ url: "https://mail.google.com/*" });
        await Promise.all(
            tabs
                .filter((tab) => tab.id !== undefined)
                .map(async (tab) => {
                    const ok = await injectContentScript(tab.id!);
                    if (!ok) console.warn(`[background] could not inject content script into ${tab.id}`);
                }),
        );
    } catch (error) {
        console.error("[background] inject open Gmail tabs failed:", error);
    }
};