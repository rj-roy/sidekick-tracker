const OS_MAP: Array<[RegExp, string]> = [
  [/Windows NT/i, "windows"],
  [/iPhone|iPad|iPod/i, "ios"],
  [/Mac OS X/i, "macos"],
  [/Android/i, "android"],
  [/CrOS/i, "chromeos"],
  [/Linux/i, "linux"],
];

const detectOs = (userAgent: string): string => {
  for (const [regex, label] of OS_MAP) {
    if (regex.test(userAgent)) return label;
  }
  return "unknown";
};

const detectBrowser = (userAgent: string): string => {
  if (userAgent.includes("SamsungBrowser/")) return "samsung";
  if (userAgent.includes("Edg/")) return "edge";
  if (userAgent.includes("OPR/") || userAgent.includes("Opera")) return "opera";
  if (userAgent.includes("CriOS/")) return "crios";
  if (userAgent.includes("Firefox/")) return "firefox";
  if (userAgent.includes("Chrome/")) return "chrome";
  if (userAgent.includes("Version/")) return "safari";
  return "unknown";
};

export const uaFamily = (userAgent: string): string =>
  `${detectBrowser(userAgent)}-${detectOs(userAgent)}`;