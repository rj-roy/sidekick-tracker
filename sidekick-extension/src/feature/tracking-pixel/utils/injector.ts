import type { PixelRule } from "../types";
import { matchesUrl } from "../matcher/matcher";

const firedKeys = new Set<string>();

function buildPixelUrl(template: string): string {
  const ts = Date.now().toString();
  const rand = Math.random().toString(36).substring(2, 10);
  const url = encodeURIComponent(window.location.href);
  const referrer = encodeURIComponent(document.referrer || "");

  return template
    .replace(/\{url\}/gi, url)
    .replace(/\{referrer\}/gi, referrer)
    .replace(/\{ts\}/gi, ts)
    .replace(/\{rand\}/gi, rand)
    .replace(/\{random\}/gi, rand);
}

function createPixelImage(pixelUrl: string): HTMLImageElement {
  const img = document.createElement("img");
  img.src = pixelUrl;
  img.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
  img.setAttribute("alt", "");
  img.setAttribute("aria-hidden", "true");
  return img;
}

function firePixel(rule: PixelRule, navType: "pageLoad" | "spaNavigation") {
  if (!rule.enabled) {
    return;
  }

  if (navType === "pageLoad" && rule.fireOn !== "pageLoad" && rule.fireOn !== "both") {
    return;
  }

  if (navType === "spaNavigation" && rule.fireOn !== "spaNavigation" && rule.fireOn !== "both") {
    return;
  }

  if (!matchesUrl(window.location.href, rule.urlPatterns)) {
    return;
  }

  const key = `${rule.id}:${navType}:${window.location.href.split("#")[0]}`;
  if (firedKeys.has(key)) {
    return;
  }
  firedKeys.add(key);

  try {
    const pixelUrl = buildPixelUrl(rule.pixelUrl);
    const img = createPixelImage(pixelUrl);
    document.body.appendChild(img);
  } catch (error) {
    console.error("Failed to fire pixel:", error);
  }
}

export function firePixelsForRules(rules: PixelRule[], navType: "pageLoad" | "spaNavigation") {
  for (const rule of rules) {
    firePixel(rule, navType);
  }
}

export function clearFiredKeys() {
  firedKeys.clear();
}
