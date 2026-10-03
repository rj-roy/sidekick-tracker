import { getRules } from "@/feature/tracking-pixel/storage/storage";
import { firePixelsForRules } from "@/feature/tracking-pixel/utils/injector";

export default defineContentScript({
  matches: ['<all_urls>'],

  async main(ctx) {
    try {
      const rules = await getRules();
      firePixelsForRules(rules, "pageLoad");
    } catch (error) {
      console.error("Pixel injector content script error:", error);
    }

    const handleNavigation = async () => {
      try {
        const rules = await getRules();
        firePixelsForRules(rules, "spaNavigation");
      } catch (error) {
        console.error("Pixel injector SPA navigation error:", error);
      }
    };

    ctx.addEventListener(window, 'wxt:locationchange', handleNavigation);
  },
});