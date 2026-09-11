interface NavigatorUABrandVersion {
  brand: string;
  version: string;
}

interface NavigatorUAData {
  brands: NavigatorUABrandVersion[];
  mobile: boolean;
  platform: string;
  getHighEntropyValues(keywords: string[]): Promise<Record<string, unknown>>;
}

interface Navigator {
  userAgentData?: NavigatorUAData;
}