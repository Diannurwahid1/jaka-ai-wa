import { Db, MongoClient } from "mongodb";

import { readSettings } from "@/lib/settings";

declare global {
  var mongoClientGlobal:
    | {
        uri: string;
        client: MongoClient;
      }
    | undefined;
}

export async function getMongoDatabase(): Promise<Db> {
  const settings = await readSettings();
  const uri = settings.mongodbUri.trim();
  const dbName = settings.mongodbDb.trim();

  if (!uri || !dbName) {
    throw new Error("MongoDB configuration is incomplete.");
  }

  if (!globalThis.mongoClientGlobal || globalThis.mongoClientGlobal.uri !== uri) {
    globalThis.mongoClientGlobal = {
      uri,
      client: new MongoClient(uri)
    };
  }

  const client = globalThis.mongoClientGlobal.client;

  try {
    await client.connect();
  } catch (error) {
    globalThis.mongoClientGlobal = undefined;
    throw error;
  }

  return client.db(dbName);
}
