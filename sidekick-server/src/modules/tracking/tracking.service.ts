import { randomBytes } from "crypto";
import type { ObjectId } from "mongodb";
import { ApiError } from "../../utils/error/ApiError.js";
import { TrackingRepository } from "./tracking.repository.js";
import type { CreateTrackingMeta, CreatedTracking, TrackedEmailDoc } from "./tracking.types.js";

const TOKEN_BYTES = 24;
const MAX_SUBJECT_LENGTH = 200;
const MAX_RECIPIENTS = 100;
const MAX_ATTEMPTS = 3;

const generateToken = (): string => randomBytes(TOKEN_BYTES).toString("base64url");

// const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
// export const isValidTrackingToken = (value: unknown): value is string =>
//     typeof value === "string" && TOKEN_PATTERN.test(value);

export const TrackingService = {
    async createTracking(userId: ObjectId, meta: CreateTrackingMeta = {}): Promise<CreatedTracking> {
        const now = new Date();

        const subject = meta.subject?.trim().slice(0, MAX_SUBJECT_LENGTH);
        const recipientCount = Math.min(
            Math.max(Math.trunc(meta.recipientCount ?? 1), 0),
            MAX_RECIPIENTS
        );

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            const doc: TrackedEmailDoc = {
                userId,
                uniqueToken: generateToken(),
                status: "pending",
                recipientCount,
                openCount: 0,
                createdAt: now,
                updatedAt: now,
                ...(subject ? { subject } : {}),
            };

            try {
                await TrackingRepository.createTrackedEmail(doc);
                return { token: doc.uniqueToken, createdAt: now };

            } catch (err) {
                const isCollision = err instanceof ApiError && err.code === "TRACKING_TOKEN_COLLISION";

                if (!isCollision || attempt === MAX_ATTEMPTS) {
                    throw err;
                };
            };
        };

        throw new ApiError(500, "Failed to create tracking pixel", "TRACKING_CREATE_FAILED");
    },

    // async recordOpen(uniqueToken: string, ctx: OpenContext): Promise<boolean> {
    //     const tracked = await TrackingRepository.findByToken(uniqueToken);

    //     if (!tracked) {
    //         return false;
    //     };

    //     const updated = await TrackingRepository.recordOpen(
    //         tracked._id,
    //         uniqueToken,
    //         new Date(),
    //         ctx
    //     );

    //     return !!updated;
    // },
};
