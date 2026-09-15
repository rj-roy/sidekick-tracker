import { MongoServerError, ObjectId, WithId } from "mongodb";
import { env } from "../../config/env.js";
import { ensureDB } from "../../database/mongodb.js"
import { SessionDoc } from "./session.types.js";
import { ApiError } from "../../utils/ApiError.js";

const collection = async () => {
    const db = await ensureDB();
    return db.collection<SessionDoc>(env.mongodb.collections.sessions);
};

export const SessionRepository = {
    
    //reviewed
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

    //reviewed
    async findBySessionIdHash(sessionIdHash: string): Promise<WithId<SessionDoc> | null> {
        return await (await collection()).findOne({ sessionIdHash });
    },

    //reviewed
    async touchSession(sessionIdHash: string, lastSeenAt: Date): Promise<void> {
        await (await collection()).updateOne(
            { sessionIdHash },
            { $set: { lastSeenAt } }
        );
    },

    //reviewed
    async revokeSession(sessionIdHash: string, revokeReason: string): Promise<void> {
        await (await collection()).updateOne(
            { sessionIdHash, revokedAt: { $exists: false } },
            { $set: { revokedAt: new Date(), revokeReason } }
        );
    },

    //reviewed
    async claimRotation(sessionIdHash: string, rotatedAt: Date, rotatedToHash: string): Promise<boolean> {
        const result = await (await collection()).updateOne(
            { sessionIdHash, rotatedAt: { $exists: false }, revokedAt: { $exists: false } },
            { $set: { rotatedAt, rotatedToHash } }
        );

        return result.modifiedCount === 1;
    },

    //reviewed
    async deleteBySessionIdHash(sessionIdHash: string): Promise<void> {
        await (await collection()).deleteOne({ sessionIdHash });
    },

    //reviewed
    async findByUserId(userId: ObjectId): Promise<WithId<SessionDoc>[]> {
        return await (await collection())
            .find({ userId })
            .sort({ lastSeenAt: -1 })
            .toArray();
    },

    //reviewed
    async findById(sessionId: ObjectId): Promise<WithId<SessionDoc> | null> {
        return await (await collection()).findOne({ _id: sessionId });
    },

    //reviewed
    async revokeById(userId: ObjectId, sessionId: ObjectId, revokeReason: string): Promise<boolean> {
        const result = await (await collection()).updateOne(
            { _id: sessionId, userId, revokedAt: { $exists: false } },
            { $set: { revokedAt: new Date(), revokeReason } }
        );

        return result.modifiedCount === 1;
    },

    //reviewed
    async revokeAllForUser(userId: ObjectId, revokeReason: string): Promise<number> {
        const result = await (await collection()).updateMany(
            { userId, revokedAt: { $exists: false } },
            { $set: { revokedAt: new Date(), revokeReason } }
        );

        return result.modifiedCount;
    },
};