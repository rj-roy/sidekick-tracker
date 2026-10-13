import { MongoServerError, type ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { ensureDB } from "../../database/mongodb.js";

const trackedEmails = async () => {
    const db = await ensureDB();
    return db.collection(env.mongodb.collections.trackedEmails);
};

export const TrackingRepository = {
    async markTrackedEmailSent(
        uniqueToken: string, userId: ObjectId,
        updatedAt: Date, subject?: string,
        recipient?: string[]
    ) {
        const recipients = recipient ?? [];

        try {
            return await (await trackedEmails()).updateOne(
                { userId, uniqueToken },
                {
                    $set: {
                        status: "sent" as const,
                        recipient: recipients,
                        recipientCount: recipients.length,
                        updatedAt,
                        ...(subject !== undefined ? { subject } : {}),
                    },
                    $setOnInsert: {
                        userId,
                        uniqueToken,
                        opened: false,
                        openCount: 0,
                        createdAt: updatedAt,
                    },
                },
                { upsert: true },
            );

        } catch (error) {
            if (error instanceof MongoServerError && error.code === 11000) {
                const existing = await (await trackedEmails()).updateOne(
                    { userId, uniqueToken },
                    {
                        $set: {
                            status: "sent" as const,
                            recipient: recipients,
                            recipientCount: recipients.length,
                            updatedAt,
                            ...(subject !== undefined ? { subject } : {}),
                        },
                    },
                );

                return existing.matchedCount > 0 ? existing : null;
            };

            throw error;
        };
    },
};
