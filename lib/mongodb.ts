import { Db, MongoClient, MongoClientOptions } from "mongodb";

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

function readMongoNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name] ?? "");
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getMongoClientOptions(): MongoClientOptions {
  return {
    serverSelectionTimeoutMS: readMongoNumberEnv("MONGODB_SERVER_SELECTION_TIMEOUT_MS", 60000),
    connectTimeoutMS: readMongoNumberEnv("MONGODB_CONNECT_TIMEOUT_MS", 30000),
    socketTimeoutMS: readMongoNumberEnv("MONGODB_SOCKET_TIMEOUT_MS", 120000),
    maxIdleTimeMS: readMongoNumberEnv("MONGODB_MAX_IDLE_TIME_MS", 60000),
    retryWrites: true
  };
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
      client: new MongoClient(uri, getMongoClientOptions())
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
