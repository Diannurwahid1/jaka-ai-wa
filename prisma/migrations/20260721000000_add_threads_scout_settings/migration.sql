-- Migration: Add Threads Scout settings columns
ALTER TABLE "AppConfig"
  ADD COLUMN IF NOT EXISTS "threadsScoutEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "threadsScoutKeywords" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "threadsScoutPersona" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "threadsScoutSellAngle" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "threadsScoutLimitPerKeyword" TEXT NOT NULL DEFAULT '20',
  ADD COLUMN IF NOT EXISTS "threadsScoutMaxRepliesPerRun" TEXT NOT NULL DEFAULT '5',
  ADD COLUMN IF NOT EXISTS "threadsScoutRepliedIds" TEXT NOT NULL DEFAULT '';
