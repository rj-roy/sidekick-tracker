import { processEmails } from "./email-processing.job.js";
import { cleanupTrackingEvents } from "./cleanup-tracking-events.job.js";
import { syncSubscriptions } from "./subscription-sync.job.js";

const EMAIL_POLL_INTERVAL_MS = Number(process.env.EMAIL_POLL_INTERVAL_MS || 5 * 60 * 1000);
const CLEANUP_INTERVAL_MS = Number(process.env.TRACKING_CLEANUP_INTERVAL_MS || 24 * 60 * 60 * 1000);

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
  schedule("email-processing", () => processEmails(), EMAIL_POLL_INTERVAL_MS);
  schedule("cleanup-tracking-events", cleanupTrackingEvents, CLEANUP_INTERVAL_MS);
  schedule("subscription-sync", syncSubscriptions, CLEANUP_INTERVAL_MS);
};