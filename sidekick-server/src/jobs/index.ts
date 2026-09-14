import { processEmails } from "./email-processing.job.js";
import { cleanupTrackingEvents } from "./cleanup-tracking-events.job.js";
import { cleanupSessions } from "./session-cleanup.job.js";
import { syncSubscriptions } from "./subscription-sync.job.js";
import { env } from "../config/env.js";

const schedule = (name: string, task: () => Promise<void>, intervalMs: number): void => {
  let running = false;

  const run = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      await task();
    } catch (err) {
      console.error(`[jobs] ${name} failed:`, err);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(run, Math.max(intervalMs, 1_000));
  timer.unref();

  console.log(`[jobs] scheduled: ${name} (every ${Math.round(intervalMs / 1000)}s)`);
};

export const startJobs = (): void => {
  schedule("email-processing", () => processEmails(), env.jobs.emailPollIntervalMs);
  schedule("cleanup-tracking-events", cleanupTrackingEvents, env.jobs.trackingCleanupIntervalMs);
  schedule("cleanup-sessions", cleanupSessions, env.jobs.sessionCleanupIntervalMs);
  schedule("subscription-sync", syncSubscriptions, env.jobs.trackingCleanupIntervalMs);
};