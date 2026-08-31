import { MongoClient, type Db } from "mongodb";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(env.mongodb.uri);
  await client.connect();
  db = client.db(env.mongodb.dbName);

  console.log(`[database] Connected to MongoDB: ${env.mongodb.dbName}`);
  return db;
}

export function getDB(): Db {
  if (!db) {
    throw new ApiError(500, "Database not connected.");
  }
  return db;
}

export function getClient(): MongoClient {
  if (!client) {
    throw new ApiError(500, "Database client not connected.");
  }
  return client;
}

export async function disconnectDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
