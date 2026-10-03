import type { PixelRule } from "../types";

const STORAGE_KEY = "pixelRules";

export async function getRules(): Promise<PixelRule[]> {
  try {
    const data = await browser.storage.local.get(STORAGE_KEY);
    const rules = (data as any)[STORAGE_KEY];
    return Array.isArray(rules) ? rules : [];
  } catch (error) {
    console.error("Failed to get pixel rules:", error);
    return [];
  }
}

export async function setRules(rules: PixelRule[]): Promise<void> {
  try {
    await browser.storage.local.set({ [STORAGE_KEY]: rules });
  } catch (error) {
    console.error("Failed to set pixel rules:", error);
    throw error;
  }
}

export async function addRule(rule: PixelRule): Promise<void> {
  const rules = await getRules();
  rules.push(rule);
  await setRules(rules);
}

export async function updateRule(id: string, updates: Partial<Omit<PixelRule, "id" | "createdAt">>): Promise<void> {
  const rules = await getRules();
  const index = rules.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error(`Rule with id ${id} not found`);
  }
  rules[index] = {
    ...rules[index],
    ...updates,
    updatedAt: Date.now(),
  } as PixelRule;
  await setRules(rules);
}

export async function deleteRule(id: string): Promise<void> {
  const rules = await getRules();
  const filtered = rules.filter((r) => r.id !== id);
  await setRules(filtered);
}

export async function toggleRule(id: string, enabled: boolean): Promise<void> {
  const rules = await getRules();
  const rule = rules.find((r) => r.id === id);
  if (rule) {
    rule.enabled = enabled;
    rule.updatedAt = Date.now();
    await setRules(rules);
  }
}

export async function getRuleById(id: string): Promise<PixelRule | undefined> {
  const rules = await getRules();
  return rules.find((r) => r.id === id);
}
