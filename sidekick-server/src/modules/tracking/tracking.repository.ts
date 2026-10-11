import type { ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { ensureDB } from "../../database/mongodb.js";

const trackedEmails = async () => {
    const db = await ensureDB();
    return db.collection(env.mongodb.collections.trackedEmails);
};

// const emailOpens = async () => {
//     const db = await ensureDB();
//     return db.collection<EmailOpenDoc>(env.mongodb.collections.emailOpens);
// };

export const TrackingRepository = {
    // async createTrackedEmail(doc: TrackedEmailDoc): Promise<WithId<TrackedEmailDoc>> {
    //     try {
    //         const result = await (await trackedEmails()).insertOne(doc);
    //         return { ...doc, _id: result.insertedId };

    //     } catch (error) {
    //         if (error instanceof MongoServerError && error.code === 11000) {
    //             throw new ApiError(500, "Tracking token collision", "TRACKING_TOKEN_COLLISION");
    //         };
    //         throw error;
    //     };
    // },

    async markTrackedEmailSent(uniqueToken: string, userId: ObjectId, updatedAt: Date, subject?: string, recipient?: string[]){
        return await (await trackedEmails()).insertOne({
            userId: userId,
            trackingToken: uniqueToken,
            recipient: recipient || [],
            updatedAt,
            subject,
            opened: false,
        });
    },

    // async findByToken(uniqueToken: string): Promise<WithId<TrackedEmailDoc> | null> {
    //     return await (await trackedEmails()).findOne({ uniqueToken });
    // },

    // async recordOpen(
    //     trackedEmailId: ObjectId,
    //     uniqueToken: string,
    //     openedAt: Date,
    //     ctx: OpenContext
    // ): Promise<WithId<TrackedEmailDoc> | null> {
    //     const open: EmailOpenDoc = {
    //         trackedEmailId,
    //         uniqueToken,
    //         openedAt,
    //         ...(ctx.userAgent ? { userAgent: ctx.userAgent } : {}),
    //         ...(ctx.ip ? { ip: ctx.ip } : {}),
    //     };

    //     await (await emailOpens()).insertOne(open);

    //     return await (await trackedEmails()).findOneAndUpdate(
    //         { _id: trackedEmailId },
    //         {
    //             $inc: { openCount: 1 },
    //             $set: { status: "opened", updatedAt: openedAt },
    //             $min: { firstOpenedAt: openedAt },
    //         },
    //         { returnDocument: "after" }
    //     );
    // },

    // async deleteOpensBefore(cutoff: Date): Promise<number> {
    //     const result = await (await emailOpens()).deleteMany({ openedAt: { $lt: cutoff } });
    //     return result.deletedCount;
    // },
};
