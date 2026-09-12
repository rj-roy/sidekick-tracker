import { MongoServerError, WithId } from "mongodb";
import { env } from "../../config/env.js";
import { ensureDB } from "../../database/mongodb.js"
import { SessionDoc } from "./session.types.js";
import { ApiError } from "../../utils/ApiError.js";

const collection = async () => {
    const db = await ensureDB();
    return db.collection<SessionDoc>(env.mongodb.collections.sessions);
};

export const SessionRepository = {
    async upsertSession(doc: SessionDoc): Promise<WithId<SessionDoc>> {
        try {
            const result = await (await collection()).insertOne(doc);
            return { ...doc, _id: result.insertedId };
        } catch (error) {
            if (error instanceof MongoServerError && error.code === 11000) {
                throw new ApiError(500, "Session collision", "SESSION_COLLISION");
            }
            throw error;
        };
    },

    async findBySessionIdHash(sessionIdHash: string): Promise<WithId<SessionDoc> | null> {
        return await (await collection()).findOne({ sessionIdHash });
    },

    async touchSession(sessionIdHash: string, lastSeenAt: Date): Promise<void> {
        await (await collection()).updateOne(
            { sessionIdHash },
            { $set: { lastSeenAt } }
        );
    },

    async revokeSession(sessionIdHash: string, revokeReason: string): Promise<void> {
        await (await collection()).updateOne(
            { sessionIdHash, revokedAt: { $exists: false } },
            { $set: { revokedAt: new Date(), revokeReason } }
        );
    },
};