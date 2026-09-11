import { ensureDB } from "../../database/index.js";
import { MongoServerError, type WithId } from "mongodb";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import type { SessionDoc } from "./session.types.js";

const collection = async () => {
  const db = await ensureDB();
  return db.collection<SessionDoc>(env.mongodb.collections.sessions);
};

export interface SessionRotation {
  tokenHash: string;
  rotationKeyHash: string;
  expiresAt: Date;
  lastSeenAt: Date;
  updatedAt: Date;
}

export const SessionRepository = {
  async create(doc: SessionDoc): Promise<WithId<SessionDoc>> {
    try {
      const result = await (await collection()).insertOne(doc);
      return { ...doc, _id: result.insertedId };
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        throw new ApiError(500, "Session collision", "SESSION_COLLISION");
      }
      throw err;
    }
  },

  async findByTokenHash(tokenHash: string): Promise<WithId<SessionDoc> | null> {
    return (await collection()).findOne({ tokenHash });
  },

  async rotate(
    currentTokenHash: string,
    next: SessionRotation
  ): Promise<WithId<SessionDoc> | null> {
    return (await collection()).findOneAndUpdate(
      { tokenHash: currentTokenHash },
      { $set: next },
      { returnDocument: "after" }
    );
  },

  async destroyByTokenHash(tokenHash: string) {
    return (await collection()).deleteOne({ tokenHash });
  },
};