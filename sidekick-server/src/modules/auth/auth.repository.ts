import { getDB } from "../../database/index.js";
import { MongoServerError } from "mongodb";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";

const collection = () => getDB().collection(env.mongodb.collections.users);

export const AuthRepository = {

    async upsert(userData: { googleId: string; email: string; name: string; picture?: string; emailVerified?: boolean; }) {
        const now = new Date();
        let result;
        try {
            result = await collection().findOneAndUpdate(
                { email: userData.email },
                {
                    $set: {
                        googleId: userData.googleId,
                        name: userData.name,
                        picture: userData.picture,
                        emailVerified: userData.emailVerified,
                        updatedAt: now,
                    },
                    $setOnInsert: {
                        email: userData.email,
                        createdAt: now,
                    },
                },
                { upsert: true, returnDocument: "after" }
            );
        } catch (err) {
            if (!(err instanceof MongoServerError) || err.code !== 11000) {
                throw err;
            }
            result = await collection().findOne({ email: userData.email });
        }

        if (!result) {
            throw new ApiError(500, "Failed to create or update user");
        };

        return result;
    },
};
