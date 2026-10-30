import { MongoServerError, type ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { ensureDB } from "../../database/mongodb.js";
import type { EmailOpenDoc } from "./tracking.types.js";

const trackedEmails = async () => {
    const db = await ensureDB();
    return db.collection(env.mongodb.collections.trackedEmails);
};

const emailOpens = async () => {
    const db = await ensureDB();
    return db.collection(env.mongodb.collections.emailOpens);
};

export const TrackingRepository = {
    async markTrackedEmailSent(
        uniqueToken: string,
        userId: ObjectId,
        meta: { sentAt: Date; subject?: string; recipient?: string[]; messageId?: string },
    ) {
        const recipients = meta.recipient ?? [];
        const now = new Date();

        const set = {
            status: "sent" as const,
            recipient: recipients,
            recipientCount: recipients.length,
            sentAt: meta.sentAt,
            updatedAt: now,
            ...(meta.subject !== undefined ? { subject: meta.subject } : {}),
            ...(meta.messageId !== undefined ? { messageId: meta.messageId } : {}),
        };

        try {
            return await (await trackedEmails()).updateOne(
                { userId, uniqueToken },
                {
                    $set: set,
                    $setOnInsert: {
                        userId,
                        uniqueToken,
                        opened: false,
                        openCount: 0,
                        createdAt: now,
                    },
                },
                { upsert: true },
            );
        } catch (error) {
            if (error instanceof MongoServerError && error.code === 11000) {
                const existing = await (await trackedEmails()).updateOne(
                    { userId, uniqueToken },
                    { $set: set },
                );
                return existing.matchedCount > 0 ? existing : null;
            }
            throw error;
        }
    },

    async findTrackedEmailByToken(uniqueToken: string) {
        return await (await trackedEmails()).findOne({ uniqueToken });
    },

    async insertOpen(doc: EmailOpenDoc) {
        return await (await emailOpens()).insertOne(doc);
    },

    async markOpened(
        trackedEmailId: ObjectId,
        openedAt: Date,
        options: { countOpen: boolean; setFirst: boolean },
    ) {
        const $set: Record<string, unknown> = { updatedAt: openedAt };

        if (options.countOpen) {
            $set.status = "opened";
            $set.opened = true;
            $set.lastOpenedAt = openedAt;
            if (options.setFirst) $set.firstOpenedAt = openedAt;
        }

        return await (await trackedEmails()).updateOne(
            { _id: trackedEmailId },
            options.countOpen ? { $inc: { openCount: 1 }, $set } : { $set },
        );
    },
};
