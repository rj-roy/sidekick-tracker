export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch (error) {
    return url;
  }
}

export function matchesUrl(url: string, patterns: string[]): boolean {
  if (!patterns || patterns.length === 0) {
    return false;
  }

  try {
    const targetUrl = new URL(url);
    const target = url;
    const targetOrigin = targetUrl.origin;
    const targetHostname = targetUrl.hostname;
    const targetPathname = targetUrl.pathname;
    const targetHost = targetUrl.host;

    for (const pattern of patterns) {
      if (!pattern || !pattern.trim()) {
        continue;
      }
      const trimmed = pattern.trim();

      // Try regex pattern (if wrapped in /.../ or contains regex chars)
      if (trimmed.startsWith("/") && trimmed.lastIndexOf("/") > 0) {
        try {
          const lastSlash = trimmed.lastIndexOf("/");
          const regexStr = trimmed.slice(1, lastSlash);
          const flags = trimmed.slice(lastSlash + 1);
          const regex = new RegExp(regexStr, flags);
          if (regex.test(target) || regex.test(targetUrl.href)) {
            return true;
          }
        } catch (e) {
          // fall through
        }
      }

      // Try to treat as glob-like pattern
      // Convert glob to regex
      try {
        const globRegex = globToRegex(trimmed);
        if (globRegex.test(target) || globRegex.test(targetUrl.href) || globRegex.test(targetHostname) || globRegex.test(targetHost + targetPathname)) {
          return true;
        }
      } catch (e) {
        // skip
      }
    }
  } catch (error) {
    console.error("Error matching URL:", error);
  }

  return false;
}

function globToRegex(pattern: string): RegExp {
  let regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  regexStr = regexStr.replace(/\*/g, ".*");
  regexStr = regexStr.replace(/\?/g, ".");
  return new RegExp("^" + regexStr + "$", "i");
}
