import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";
import type { Request, Response } from "express";
import type { RedisReply } from "rate-limit-redis";
import { ApiResponse } from "../utils/http/ApiRsponse.js";
import { env } from "../config/env.js";
import { validateIp } from "../utils/user/verifyUserInfo.js";

type KeyFn = (req: Request) => string;

const CONNECT_TIMEOUT_MS = 10_000;
const MAX_RECONNECT_RETRIES = 20;

let redisClient: ReturnType<typeof createClient> | null = null;
let pendingConnect: Promise<ReturnType<typeof createClient>> | null = null;
let redisStore: RedisStore | null = null;

const reconnectStrategy = (retries: number): number | Error => {
  if (retries > MAX_RECONNECT_RETRIES) {
    return new Error("[rate-limit] Redis: max reconnection attempts reached");
  }

  return Math.min(retries * 500, 5_000) + Math.floor(Math.random() * 200);
};

const connectRedis = (): Promise<ReturnType<typeof createClient>> => {
  if (redisClient?.isOpen) return Promise.resolve(redisClient);
  if (pendingConnect) return pendingConnect;

  const client = createClient({
    url: env.rateLimit.redisUrl!,
    disableOfflineQueue: true,
    socket: {
      reconnectStrategy,
      connectTimeout: CONNECT_TIMEOUT_MS,
    },
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
      redisClient = null;
      redisStore = null;
      console.error(
        "[rate-limit] Redis connect failed, next request will retry:",
        err instanceof Error ? err.message : err
      );
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

const keyForIp = (value: string | undefined): string => {
  const { clientIp } = validateIp(value ?? "");
  return ipKeyGenerator(clientIp === "unknown" ? "anon" : clientIp);
};

export const clientIpKey: KeyFn = (req: Request): string =>
  keyForIp(req.get("x-client-ip") || req.ip);

export const publicIpKey: KeyFn = (req: Request): string =>
  keyForIp(req.get("x-client-ip") || req.ip);

export const userAwareKey: KeyFn = (req: Request): string =>
  req.userId
    ? `user:${req.userId.toHexString()}`
    : keyForIp(req.get("x-client-ip") || req.ip);

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