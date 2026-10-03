import { env } from "../config/env.js";
import { TrackingRepository } from "../modules/tracking/tracking.repository.js";

export const cleanupTrackingEvents = async (): Promise<void> => {
    const cutoff = new Date(Date.now() - env.jobs.trackingRetentionDays * 24 * 60 * 60 * 1000);

    const deletedCount = await TrackingRepository.deleteOpensBefore(cutoff);

    if (deletedCount > 0) {
        console.log(`[jobs] cleanup-tracking-events: removed ${deletedCount} events`);
    }
};
