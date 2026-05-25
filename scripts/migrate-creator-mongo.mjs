import "dotenv/config";
import { Client } from "pg";
import { MongoClient } from "mongodb";

const LEGACY_CREATOR_ID = "jaka-ai-creator";
const COLLECTIONS = [
  "creator_profiles",
  "creator_knowledge",
  "creator_drafts",
  "creator_approval_logs",
  "creator_publish_logs",
  "creator_topic_briefs"
];

const pg = new Client({ connectionString: process.env.DATABASE_URL });
await pg.connect();

let defaultBusinessId;
let mongoUri;
let mongoDb;

try {
  const business = await pg.query('select id from "Business" where "isDefault" = true limit 1');
  if (business.rows.length === 0) {
    console.error("No default business found. Run prisma migrate deploy first.");
    process.exit(1);
  }
  defaultBusinessId = business.rows[0].id;

  const cfg = await pg.query('select "mongodbUri", "mongodbDb" from "AppConfig" where "businessId" = $1', [defaultBusinessId]);
  if (cfg.rows.length === 0) {
    console.error("AppConfig for default business not found.");
    process.exit(1);
  }

  mongoUri = (cfg.rows[0].mongodbUri || process.env.MONGODB_URI || "").trim();
  mongoDb = (cfg.rows[0].mongodbDb || process.env.MONGODB_DB || "wa_ai").trim();

  if (!mongoUri) {
    console.error("MONGODB_URI not set in AppConfig or env. Skipping Mongo migration.");
    process.exit(0);
  }
} finally {
  await pg.end();
}

console.log(`Default businessId: ${defaultBusinessId}`);
console.log(`Mongo: ${mongoUri.replace(/\/\/([^:]+):[^@]+@/, "//$1:***@")} db=${mongoDb}`);

const mongo = new MongoClient(mongoUri);
await mongo.connect();
try {
  const db = mongo.db(mongoDb);

  for (const name of COLLECTIONS) {
    const coll = db.collection(name);
    const before = await coll.countDocuments({ creatorId: LEGACY_CREATOR_ID });
    if (before === 0) {
      console.log(`${name}: nothing to migrate`);
      continue;
    }

    const result = await coll.updateMany(
      { creatorId: LEGACY_CREATOR_ID },
      { $set: { creatorId: defaultBusinessId } }
    );
    console.log(`${name}: matched=${before} modified=${result.modifiedCount}`);
  }
} finally {
  await mongo.close();
}

console.log("Mongo creator data migration done.");
