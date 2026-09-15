import { MongoServerError } from "mongodb";
import type { ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { ensureDB } from "../../database/mongodb.js";
import { normalizeEmail } from "../../utils/normalize-email.js";

const collection = async () => {
    const db = await ensureDB();
    return db.collection(env.mongodb.collections.users);
};

export const AuthRepository = {

    //reviewed
    async upsert(userData: { googleId: string; email: string; name: string; picture?: string; emailVerified?: boolean; }) {
        const googleId = userData.googleId;
        const email = normalizeEmail(userData.email);
        const normalized = { ...userData, googleId, email };

        try {
            return await upsertByGoogleId(normalized);
        } catch (err) {
            if (err instanceof MongoServerError && err.code === 11000) {
                const users = await collection();

                const existing = await users.findOne({ googleId });

                if (existing) {
                    return existing;
                }

                const byEmail = await users.findOne({ email });

                if (!byEmail) {
                    throw err;
                }

                if (byEmail.googleId === googleId) {
                    return byEmail;
                }

                throw new ApiError(409, "An account using this email already exists with a different oogle account", "ACCOUNT_EMAIL_CONFLICT");
            };

            throw err;
        };
    },

    //reviewed
    async findById(id: ObjectId) {
        return await (await collection()).findOne({ _id: id });
    },
};

//reviewed
const upsertByGoogleId = async (userData: { googleId: string; email: string; name: string; picture?: string; emailVerified?: boolean; }) => {
    const now = new Date();

    return await (await collection()).findOneAndUpdate(
        { googleId: userData.googleId },
        {
            $set: {
                name: userData.name,
                picture: userData.picture,
                emailVerified: userData.emailVerified,
                updatedAt: now,
            },
            $setOnInsert: {
                googleId: userData.googleId,
                email: userData.email,
                createdAt: now,
            },
        },
        { upsert: true, returnDocument: "after" }
    );
};