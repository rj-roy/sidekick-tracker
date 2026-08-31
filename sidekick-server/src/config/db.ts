import { MongoClient, type Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not set in the environment.");
}
const uri: string = MONGODB_URI;

const dbName = process.env.MONGODB_DB_NAME;

export const USER_COLLECTION = process.env.USER_COLLECTION;
export const TRACKED_EMAILS_COLL = process.env.TRACKED_EMAILS_COLL;
export const OPEN_EMAIL_COLL = process.env.OPEN_EMAIL_COLL;

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(): Promise<MongoClient> {
  if (client) {
    return client;
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  console.log("Connected to MongoDB.");
  return client;
}

export function getDb(): Db {
  if (!db) {
    throw new Error("Database not connected. Call connectToDatabase() first.");
  }
  return db;
}

export async function disconnectDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
