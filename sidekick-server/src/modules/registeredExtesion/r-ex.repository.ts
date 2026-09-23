import { ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { ensureDB } from "../../database/mongodb.js";

const collection = async () => {
    const db = await ensureDB();
    return db.collection(env.mongodb.collections.rExCollection);
};

export const rExRepository = {
    async isExistExtId(extensionId: string): Promise<boolean> {
        const exist = await (await collection()).findOne(
            { extensionId },
            {
                projection: {
                    userId: 1,
                    _id: 0,
                },
            },
        );

        if(!exist || !exist?.userId || !ObjectId.isValid(exist.userId)){
            return false;
        };

        return true;
    },
};