import { ensureDB } from "../database/mongodb.js";
import { env } from "../config/env.js";

export const cleanupTrackingEvents = async (): Promise<void> => {
  const db = await ensureDB();
  const cutoff = new Date(Date.now() - env.jobs.trackingRetentionDays * 24 * 60 * 60 * 1000);

  const result = await db
    .collection(env.mongodb.collections.emailOpens)
    .deleteMany({ openedAt: { $lt: cutoff } });

  if (result.deletedCount > 0) {
    console.log(`[jobs] cleanup-tracking-events: removed ${result.deletedCount} events`);
  }
};