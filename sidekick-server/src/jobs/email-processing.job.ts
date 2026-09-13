import { ensureDB } from "../database/mongodb.js";
import { env } from "../config/env.js";
import { GmailService } from "../modules/gmail/gmail.service.js";
import type { GmailMessageHeader } from "../modules/gmail/gmail.types.js";

const toHeader = (headers: GmailMessageHeader[] | undefined, name: string): string | undefined => {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
};

export const processEmails = async (maxResults = 20): Promise<void> => {
  const db = await ensureDB();
  const accounts = await db
    .collection(env.mongodb.collections.googleAccounts)
    .find({})
    .project({ userId: 1, email: 1 })
    .toArray();

  for (const account of accounts) {
    try {
      const list = await GmailService.listMessages(account.userId, {
        maxResults,
        query: "newer_than:2d",
      });

      if (!list.messages?.length) continue;

      const ids = list.messages.map((m) => m.id).filter(Boolean);
      if (!ids.length) continue;

      const existing = await db
        .collection(env.mongodb.collections.trackedEmails)
        .find({ messageId: { $in: ids } })
        .project({ messageId: 1 })
        .toArray();
      const existingSet = new Set(existing.map((e) => e.messageId));

      for (const msg of list.messages) {
        if (!msg.id || existingSet.has(msg.id)) continue;

        const full = await GmailService.getMessage(account.userId, msg.id, "metadata");
        const headers = full.payload?.headers;

        await db.collection(env.mongodb.collections.trackedEmails).findOneAndUpdate(
          { messageId: msg.id },
          {
            $set: {
              userId: account.userId,
              accountEmail: account.email,
              threadId: msg.threadId,
              subject: toHeader(headers, "subject"),
              from: toHeader(headers, "from"),
              to: toHeader(headers, "to"),
              snippet: full.snippet,
              internalDate: full.internalDate ? new Date(Number(full.internalDate)) : undefined,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true, returnDocument: "after" }
        );
      }
    } catch (err) {
      console.error(`[jobs] email-processing failed for ${account.email}:`, err);
    }
  }
};