import { getDB } from "../../database/index.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";

const collection = () => getDB().collection(env.mongodb.collections.users);

export const AuthRepository = {

    async findByGoogleId(googleId: string) {
        return collection().findOne({ googleId });
    },

    // async create(userData: { googleId: string; email: string; name: string; picture?: string; }) {
    //     const now = new Date();
    //     const user = {
    //         ...userData,
    //         createdAt: now,
    //         updatedAt: now,
    //     };

    //     const result = await collection().insertOne(user);
    //     return { ...user, _id: result.insertedId };
    // },

    async upsert(userData: { googleId: string; email: string; name: string; picture?: string; }) {
        const now = new Date();
        const result = await collection().findOneAndUpdate(
            { email: userData.email },
            {
                $set: {
                    googleId: userData.googleId,
                    name: userData.name,
                    picture: userData.picture,
                    updatedAt: now,
                },
                $setOnInsert: {
                    email: userData.email,
                    createdAt: now,
                },
            },
            { upsert: true, returnDocument: "after" }
        );

        if (!result) {
            throw new ApiError(500, "Failed to create or update user");
        }

        return result;
    },
};
