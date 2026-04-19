import "dotenv/config";

import { PrismaClient } from "@prisma/client";

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

const localPrisma = new PrismaClient({
  datasourceUrl: localDatabaseUrl
});

const livePrisma = new PrismaClient({
  datasourceUrl: liveDatabaseUrl
});

async function main() {
  try {
    console.log(`[r2-live-prisma] Local DB: ${toConnectionLabel(localDatabaseUrl)}`);
    console.log(`[r2-live-prisma] Live DB: ${toConnectionLabel(liveDatabaseUrl)}`);
    console.log(`[r2-live-prisma] Mode: ${execute ? "EXECUTE" : "DRY RUN"}`);

    const localConfig = await localPrisma.appConfig.findUnique({
      where: { id: 1 },
      select: {
        r2AccessKey: true,
        r2SecretKey: true,
        r2Bucket: true,
        r2Endpoint: true,
        r2PublicUrl: true
      }
    });

    if (!localConfig) {
      throw new Error("AppConfig id=1 tidak ditemukan di local DB.");
    }

    console.log("[r2-live-prisma] Values to inject:");
    console.log(`  r2AccessKey: ${maskValue(localConfig.r2AccessKey)}`);
    console.log(`  r2SecretKey: ${maskValue(localConfig.r2SecretKey)}`);
    console.log(`  r2Bucket: ${localConfig.r2Bucket || "(empty)"}`);
    console.log(`  r2Endpoint: ${localConfig.r2Endpoint || "(empty)"}`);
    console.log(`  r2PublicUrl: ${localConfig.r2PublicUrl || "(empty)"}`);

    if (!execute) {
      console.log("[r2-live-prisma] Dry run selesai. Tambahkan --execute untuk benar-benar inject ke live.");
      return;
    }

    const liveConfig = await livePrisma.appConfig.findUnique({
      where: { id: 1 },
      select: { id: true }
    });

    if (!liveConfig) {
      throw new Error(
        'AppConfig id=1 tidak ditemukan di live DB. Jalankan migration Prisma dulu, lalu pastikan row AppConfig sudah ada.'
      );
    }

    await livePrisma.appConfig.update({
      where: { id: 1 },
      data: {
        r2AccessKey: localConfig.r2AccessKey,
        r2SecretKey: localConfig.r2SecretKey,
        r2Bucket: localConfig.r2Bucket,
        r2Endpoint: localConfig.r2Endpoint,
        r2PublicUrl: localConfig.r2PublicUrl
      }
    });

    console.log("[r2-live-prisma] Inject selesai. Hanya field R2 yang diubah. Field live lain tidak disentuh.");
  } finally {
    await localPrisma.$disconnect();
    await livePrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[r2-live-prisma] Failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
