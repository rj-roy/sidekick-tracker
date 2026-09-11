import type { Db } from "mongodb";
import { env } from "../../config/env.js";

export async function createSessionIndexes(db: Db): Promise<void> {
  const sessions = db.collection(env.mongodb.collections.sessions);
  await Promise.all([
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ userId: 1 }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    sessions.createIndex({ "device.deviceId": 1 }),
  ]);
}