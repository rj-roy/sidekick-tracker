import type { ObjectId } from "mongodb";
import { TrackingRepository } from "./tracking.repository.js";
import { hash } from "../../utils/security/crypto.js";

const MAX_SUBJECT_LENGTH = 200;
const MAX_RECIPIENTS = 100;
const MAX_ATTEMPTS = 3;



export const TrackingService = {
    // async createTracking(userId: ObjectId, meta: CreateTrackingMeta = {}): Promise<CreatedTracking> {
    //     const now = new Date();

    //     const subject = meta.subject?.trim().slice(0, MAX_SUBJECT_LENGTH);
    //     const recipientCount = Math.min(
    //         Math.max(Math.trunc(meta.recipientCount ?? 1), 0),
    //         MAX_RECIPIENTS
    //     );

    //     const token = generateToken();

    //     for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    //         const doc: TrackedEmailDoc = {
    //             userId,
    //             uniqueToken: hash(token),
    //             status: "pending",
    //             recipientCount,
    //             openCount: 0,
    //             createdAt: now,
    //             updatedAt: now,
    //             ...(subject ? { subject } : {}),
    //         };

    //         try {
    //             await TrackingRepository.createTrackedEmail(doc);
    //             return { token: encrypt(token), createdAt: now };

    //         } catch (err) {
    //             const isCollision = err instanceof ApiError && err.code === "TRACKING_TOKEN_COLLISION";

    //             if (!isCollision || attempt === MAX_ATTEMPTS) {
    //                 throw err;
    //             };
    //         };
    //     };

    //     throw new ApiError(500, "Failed to create tracking pixel", "TRACKING_CREATE_FAILED");
    // },

    async markTrackedEmailSent(token: string, userId: ObjectId, meta: { subject?: string, recipient: string[] }) {
        const uniqueToken = hash(token);
        return await TrackingRepository.markTrackedEmailSent(uniqueToken, userId, new Date(), meta.subject, meta.recipient);
    },
};
