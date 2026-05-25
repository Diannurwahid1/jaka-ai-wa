import { Db, MongoClient } from "mongodb";

import { readSettings } from "@/lib/settings";

type MongoCacheEntry = {
  uri: string;
  dbName: string;
  client: MongoClient;
};

declare global {
  // Per-business client cache. Keyed by businessId, since each business has its own Mongo URI.
  var mongoClientCacheGlobal: Map<string, MongoCacheEntry> | undefined;
}

const cache = globalThis.mongoClientCacheGlobal ?? new Map<string, MongoCacheEntry>();
if (!globalThis.mongoClientCacheGlobal) {
  globalThis.mongoClientCacheGlobal = cache;
}

export async function getMongoDatabase(businessId: string): Promise<Db> {
  const settings = await readSettings(businessId);
  const uri = settings.mongodbUri.trim();
  const dbName = settings.mongodbDb.trim();

  if (!uri || !dbName) {
    throw new Error("MongoDB configuration is incomplete.");
  }

  const existing = cache.get(businessId);

  if (!existing || existing.uri !== uri || existing.dbName !== dbName) {
    if (existing) {
      existing.client.close().catch(() => undefined);
    }
    cache.set(businessId, {
      uri,
      dbName,
      client: new MongoClient(uri)
    });
  }

  const entry = cache.get(businessId)!;

  try {
    await entry.client.connect();
  } catch (error) {
    cache.delete(businessId);
    throw error;
  }

  return entry.client.db(entry.dbName);
}
