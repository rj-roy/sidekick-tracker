import { Redis } from "@upstash/redis";

export interface RateLimitStore {
    increment(key: string, windowMs: number): Promise<number>;
}

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const createUpstashStore = (): RateLimitStore => {
    const redis = new Redis({ url: upstashUrl as string, token: upstashToken as string });

    return {
        async increment(key, windowMs) {
            const ttlSeconds = Math.ceil(windowMs / 1000);
            const count = await redis.incr(key);
            if (count === 1) {
                await redis.expire(key, ttlSeconds);
            }
            return count;
        },
    };
};

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

export const rateLimitStore: RateLimitStore =
    upstashUrl && upstashToken ? createUpstashStore() : createInMemoryStore();