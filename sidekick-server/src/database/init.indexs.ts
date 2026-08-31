import { getDB } from "./mongodb.js";
import { env } from "../config/env.js";

export async function initializeIndexes(): Promise<void> {
  const db = getDB();

  const users = db.collection(env.mongodb.collections.users);
  const trackedEmails = db.collection(env.mongodb.collections.trackedEmails);
  const emailOpens = db.collection(env.mongodb.collections.emailOpens);

  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),

    trackedEmails.createIndex({ userId: 1 }),
    trackedEmails.createIndex({ messageId: 1 }),
    trackedEmails.createIndex({ createdAt: -1 }),

    emailOpens.createIndex({ trackedEmailId: 1, openedAt: -1 }),
    emailOpens.createIndex({ uniqueToken: 1 }),
  ]);

  console.log("[database] Indexes initialized");
}
