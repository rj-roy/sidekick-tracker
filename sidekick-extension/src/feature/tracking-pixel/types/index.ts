export type FireOn = "pageLoad" | "spaNavigation" | "both";

export interface PixelRule {
  id: string;
  name: string;
  enabled: boolean;
  urlPatterns: string[];
  pixelUrl: string;
  fireOn: FireOn;
  createdAt: number;
  updatedAt: number;
}

export interface PixelRuleInput {
  name: string;
  enabled: boolean;
  urlPatterns: string[];
  pixelUrl: string;
  fireOn: FireOn;
}

export interface StoredPixelRules {
  rules: PixelRule[];
}
