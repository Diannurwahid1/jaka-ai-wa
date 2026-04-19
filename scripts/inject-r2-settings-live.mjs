import "dotenv/config";

import { Client } from "pg";

function readEnv(name, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

function maskValue(value) {
  if (!value) {
    return "(empty)";
  }

  if (value.length <= 8) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function toConnectionLabel(connectionString) {
  try {
    const url = new URL(connectionString);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "(invalid connection string)";
  }
}

const localDatabaseUrl = readEnv("LOCAL_DATABASE_URL", readEnv("DATABASE_URL"));
const liveDatabaseUrl = readEnv("LIVE_DATABASE_URL");
const execute = process.argv.includes("--execute");

if (!localDatabaseUrl) {
  throw new Error("LOCAL_DATABASE_URL atau DATABASE_URL wajib diisi.");
}

if (!liveDatabaseUrl) {
  throw new Error("LIVE_DATABASE_URL wajib diisi.");
}

const localClient = new Client({ connectionString: localDatabaseUrl });
const liveClient = new Client({ connectionString: liveDatabaseUrl });

const ensureR2ColumnsSql = `
ALTER TABLE "AppConfig"
  ADD COLUMN IF NOT EXISTS "r2AccessKey" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "r2SecretKey" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "r2Bucket" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "r2Endpoint" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "r2PublicUrl" TEXT NOT NULL DEFAULT '';
`;

const selectLocalR2Sql = `
SELECT
  "id",
  "r2AccessKey",
  "r2SecretKey",
  "r2Bucket",
  "r2Endpoint",
  "r2PublicUrl"
FROM "AppConfig"
WHERE "id" = 1
LIMIT 1;
`;

const upsertLiveR2Sql = `
INSERT INTO "AppConfig" (
  "id",
  "aiAutoReplyEnabled",
  "aiApiUrl",
  "aiApiKey",
  "aiModel",
  "promptSystem",
  "waApiUrl",
  "waSessionId",
  "waToken",
  "waMasterKey",
  "mongodbUri",
  "mongodbDb",
  "ragCollection",
  "ragIndexName",
  "embeddingProvider",
  "embeddingApiKey",
  "embeddingModel",
  "embeddingDimensions",
  "embeddingBaseUrl",
  "bytePlusApiKey",
  "bytePlusBaseUrl",
  "bytePlusImageModel",
  "r2AccessKey",
  "r2SecretKey",
  "r2Bucket",
  "r2Endpoint",
  "r2PublicUrl",
  "topicScoutSearchApiKey",
  "topicScoutSearchUrl",
  "topicScoutModelApiKey",
  "topicScoutModelBaseUrl",
  "topicScoutModel",
  "topicScoutDefaultQuery",
  "metaAppId",
  "metaAppSecret",
  "metaGraphVersion",
  "metaFacebookPageId",
  "metaFacebookPageName",
  "metaInstagramBusinessId",
  "metaInstagramUsername",
  "metaPageAccessToken",
  "metaPageTokenExpiresAt",
  "threadsUserId",
  "threadsUsername",
  "threadsAccessToken",
  "threadsTokenExpiresAt",
  "threadsApiVersion",
  "threadsApiBaseUrl",
  "linkedinClientId",
  "linkedinClientSecret",
  "linkedinRedirectUri",
  "linkedinAccessToken",
  "linkedinRefreshToken",
  "linkedinTokenExpiresAt",
  "linkedinAuthorUrn",
  "linkedinOrganizationUrn",
  "linkedinApiVersion",
  "autoPostEnabled",
  "schedulerSecret",
  "createdAt",
  "updatedAt"
) VALUES (
  1,
  true,
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  $1,
  $2,
  $3,
  $4,
  $5,
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  'v23.0',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  'v1.0',
  'https://graph.threads.net',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '202504',
  false,
  '',
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO UPDATE SET
  "r2AccessKey" = EXCLUDED."r2AccessKey",
  "r2SecretKey" = EXCLUDED."r2SecretKey",
  "r2Bucket" = EXCLUDED."r2Bucket",
  "r2Endpoint" = EXCLUDED."r2Endpoint",
  "r2PublicUrl" = EXCLUDED."r2PublicUrl",
  "updatedAt" = NOW();
`;

async function main() {
  await localClient.connect();
  await liveClient.connect();

  try {
    const localLabel = toConnectionLabel(localDatabaseUrl);
    const liveLabel = toConnectionLabel(liveDatabaseUrl);

    console.log(`[r2-live] Local DB: ${localLabel}`);
    console.log(`[r2-live] Live DB: ${liveLabel}`);
    console.log(`[r2-live] Mode: ${execute ? "EXECUTE" : "DRY RUN"}`);

    await localClient.query(ensureR2ColumnsSql);
    await liveClient.query(ensureR2ColumnsSql);

    const localResult = await localClient.query(selectLocalR2Sql);
    const localRow = localResult.rows[0];

    if (!localRow) {
      throw new Error('AppConfig id=1 tidak ditemukan di local DB.');
    }

    const values = [
      String(localRow.r2AccessKey ?? ""),
      String(localRow.r2SecretKey ?? ""),
      String(localRow.r2Bucket ?? ""),
      String(localRow.r2Endpoint ?? ""),
      String(localRow.r2PublicUrl ?? "")
    ];

    console.log("[r2-live] Values to inject:");
    console.log(`  r2AccessKey: ${maskValue(values[0])}`);
    console.log(`  r2SecretKey: ${maskValue(values[1])}`);
    console.log(`  r2Bucket: ${values[2] || "(empty)"}`);
    console.log(`  r2Endpoint: ${values[3] || "(empty)"}`);
    console.log(`  r2PublicUrl: ${values[4] || "(empty)"}`);

    if (!execute) {
      console.log("[r2-live] Dry run selesai. Tambahkan --execute untuk benar-benar inject ke live.");
      return;
    }

    await liveClient.query("BEGIN");
    await liveClient.query(ensureR2ColumnsSql);
    await liveClient.query(upsertLiveR2Sql, values);
    await liveClient.query("COMMIT");

    console.log("[r2-live] Inject selesai. Hanya field R2 yang diubah. Field live lain tidak disentuh.");
  } catch (error) {
    await liveClient.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await localClient.end();
    await liveClient.end();
  }
}

main().catch((error) => {
  console.error("[r2-live] Failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
