import { getDB } from "./mongodb.js";
import { env } from "../config/env.js";

export async function initializeIndexes(): Promise<void> {
  const db = getDB();

  const users = db.collection(env.mongodb.collections.users);
  const trackedEmails = db.collection(env.mongodb.collections.trackedEmails);
  const emailOpens = db.collection(env.mongodb.collections.emailOpens);
  const googleAccounts = db.collection(env.mongodb.collections.googleAccounts);
  const sessions = db.collection(env.mongodb.collections.sessions);

  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),

    trackedEmails.createIndex({ userId: 1 }),
    trackedEmails.createIndex({ messageId: 1 }),
    trackedEmails.createIndex({ createdAt: -1 }),

    emailOpens.createIndex({ trackedEmailId: 1, openedAt: -1 }),
    emailOpens.createIndex({ uniqueToken: 1 }),

    googleAccounts.createIndex({ userId: 1 }, { unique: true }),
    googleAccounts.createIndex({ email: 1 }, { unique: true }),

    sessions.createIndex({ sessionIdHash: 1 }, { unique: true }),
    sessions.createIndex({ userId: 1 }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);

  console.log("[database] Indexes initialized");
}
