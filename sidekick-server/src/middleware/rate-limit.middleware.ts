import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";
import type { Request, Response } from "express";
import type { RedisReply } from "rate-limit-redis";
import { ApiResponse } from "../utils/ApiRsponse.js";
import { env } from "../config/env.js";

type KeyFn = (req: Request) => string;

let redisClient: ReturnType<typeof createClient> | null = null;
let pendingConnect: Promise<ReturnType<typeof createClient>> | null = null;
let redisStore: RedisStore | null = null;

const connectRedis = (): Promise<ReturnType<typeof createClient>> => {
  if (redisClient?.isOpen) return Promise.resolve(redisClient);
  if (pendingConnect) return pendingConnect;

  const client = createClient({
    url: env.rateLimit.redisUrl!,
    socket: { reconnectStrategy: false },
  });
  client.on("error", (err) => console.error("[rate-limit] Redis error:", err));

  pendingConnect = client
    .connect()
    .then(() => {
      redisClient = client;
      return client;
    })
    .catch((err) => {
      pendingConnect = null;
      throw err;
    });

  return pendingConnect;
};

const getRedisStore = (): RedisStore | null => {
  if (!env.rateLimit.redisUrl) return null;
  if (redisStore) return redisStore;

  redisStore = new RedisStore({
    sendCommand: (...args: string[]) =>
      connectRedis().then((client) => client.sendCommand<RedisReply>(args)),
  });

  return redisStore;
};

export const createRateLimit = ({ windowMs, limit, keyGenerator }: {
    windowMs: number;
    limit: number;
    keyGenerator?: KeyFn;
}) => {
    const options = {
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator,
        handler: (_req: Request, res: Response) => {
            return ApiResponse.error(res, "Too many requests", 429, "RATE_LIMIT");
        },
    };

    const store = getRedisStore();

    return store ? rateLimit({ ...options, store }) : rateLimit(options);
};