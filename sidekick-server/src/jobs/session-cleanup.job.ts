import { ensureDB } from "../database/mongodb.js";
import { env } from "../config/env.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const cleanupSessions = async (): Promise<void> => {
  const db = await ensureDB();
  const now = new Date();
  const retentionCutoff = new Date(now.getTime() - env.jobs.sessionRetentionDays * DAY_MS);

  const result = await db
    .collection(env.mongodb.collections.sessions)
    .deleteMany({
      $or: [
        { revokedAt: { $lt: retentionCutoff } },
        { expiresAt: { $lt: now }, createdAt: { $lt: retentionCutoff } },
      ],
    });

  if (result.deletedCount > 0) {
    console.log(`[jobs] cleanup-sessions: removed ${result.deletedCount} stale sessions`);
  }
};