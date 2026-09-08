export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<number>;
}

const createInMemoryStore = (): RateLimitStore => {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    async increment(key, windowMs) {
      const now = Date.now();
      const existing = buckets.get(key);

      if (!existing || existing.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return 1;
      }

      existing.count += 1;
      return existing.count;
    },
  };
};

export const rateLimitStore: RateLimitStore = createInMemoryStore();
