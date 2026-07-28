-- Manual migration for production VPS
-- This adds multi-tenant Business support to existing tables
-- Run this BEFORE prisma db push

BEGIN;

-- 1. Create Business table
CREATE TABLE IF NOT EXISTS "Business" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "niche" TEXT NOT NULL DEFAULT '',
  "brandSummary" TEXT NOT NULL DEFAULT '',
  "audience" TEXT NOT NULL DEFAULT '',
  "brandVisualStyle" TEXT NOT NULL DEFAULT '',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Business_slug_key" ON "Business"("slug");
CREATE INDEX IF NOT EXISTS "Business_isDefault_idx" ON "Business"("isDefault");

-- 2. Insert default business (Citra Digital Hotel - the existing production business)
INSERT INTO "Business" ("id", "slug", "name", "isDefault", "createdAt", "updatedAt")
VALUES ('3081b1a8-98a2-4304-8223-87d768a13002', 'citra-digital-hotel', 'Citra Digital Hotel', true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- 3. Add businessId to AppConfig (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AppConfig' AND column_name='businessId') THEN
    ALTER TABLE "AppConfig" ADD COLUMN "businessId" TEXT;
    UPDATE "AppConfig" SET "businessId" = '3081b1a8-98a2-4304-8223-87d768a13002';
    ALTER TABLE "AppConfig" ALTER COLUMN "businessId" SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "AppConfig_businessId_key" ON "AppConfig"("businessId");
    ALTER TABLE "AppConfig" ADD CONSTRAINT "AppConfig_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Add businessId to AdminUser (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AdminUser' AND column_name='businessId') THEN
    ALTER TABLE "AdminUser" ADD COLUMN "businessId" TEXT;
    UPDATE "AdminUser" SET "businessId" = '3081b1a8-98a2-4304-8223-87d768a13002';
    ALTER TABLE "AdminUser" ALTER COLUMN "businessId" SET NOT NULL;
    CREATE INDEX IF NOT EXISTS "AdminUser_businessId_idx" ON "AdminUser"("businessId");
    ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 5. Add businessId to MessageLog (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MessageLog' AND column_name='businessId') THEN
    ALTER TABLE "MessageLog" ADD COLUMN "businessId" TEXT;
    UPDATE "MessageLog" SET "businessId" = '3081b1a8-98a2-4304-8223-87d768a13002';
    ALTER TABLE "MessageLog" ALTER COLUMN "businessId" SET NOT NULL;
    CREATE INDEX IF NOT EXISTS "MessageLog_businessId_createdAt_idx" ON "MessageLog"("businessId", "createdAt");
    CREATE INDEX IF NOT EXISTS "MessageLog_businessId_fromPhone_idx" ON "MessageLog"("businessId", "fromPhone");
    ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 6. Add businessId to MemorySession (if not exists) - this one is tricky because it's part of composite PK
-- We need to recreate the table structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MemorySession' AND column_name='businessId') THEN
    -- Drop old primary key
    ALTER TABLE "MemoryMessage" DROP CONSTRAINT IF EXISTS "MemoryMessage_businessId_phone_fkey";
    ALTER TABLE "MemoryMessage" DROP CONSTRAINT IF EXISTS "MemoryMessage_phone_fkey";
    ALTER TABLE "MemorySession" DROP CONSTRAINT IF EXISTS "MemorySession_pkey";
    
    -- Add businessId to MemorySession
    ALTER TABLE "MemorySession" ADD COLUMN "businessId" TEXT;
    UPDATE "MemorySession" SET "businessId" = '3081b1a8-98a2-4304-8223-87d768a13002';
    ALTER TABLE "MemorySession" ALTER COLUMN "businessId" SET NOT NULL;
    
    -- New composite PK
    ALTER TABLE "MemorySession" ADD CONSTRAINT "MemorySession_pkey" PRIMARY KEY ("businessId", "phone");
    CREATE INDEX IF NOT EXISTS "MemorySession_businessId_lastActive_idx" ON "MemorySession"("businessId", "lastActive");
    ALTER TABLE "MemorySession" ADD CONSTRAINT "MemorySession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 7. Add businessId to MemoryMessage (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='MemoryMessage' AND column_name='businessId') THEN
    ALTER TABLE "MemoryMessage" ADD COLUMN "businessId" TEXT;
    UPDATE "MemoryMessage" SET "businessId" = '3081b1a8-98a2-4304-8223-87d768a13002';
    ALTER TABLE "MemoryMessage" ALTER COLUMN "businessId" SET NOT NULL;
    CREATE INDEX IF NOT EXISTS "MemoryMessage_businessId_phone_createdAt_idx" ON "MemoryMessage"("businessId", "phone", "createdAt");
    ALTER TABLE "MemoryMessage" ADD CONSTRAINT "MemoryMessage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "MemoryMessage" ADD CONSTRAINT "MemoryMessage_businessId_phone_fkey" FOREIGN KEY ("businessId", "phone") REFERENCES "MemorySession"("businessId", "phone") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 8. Add businessId to WebhookEvent (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='WebhookEvent' AND column_name='businessId') THEN
    ALTER TABLE "WebhookEvent" ADD COLUMN "businessId" TEXT;
    UPDATE "WebhookEvent" SET "businessId" = '3081b1a8-98a2-4304-8223-87d768a13002';
    ALTER TABLE "WebhookEvent" ALTER COLUMN "businessId" SET NOT NULL;
    CREATE INDEX IF NOT EXISTS "WebhookEvent_businessId_createdAt_idx" ON "WebhookEvent"("businessId", "createdAt");
    CREATE INDEX IF NOT EXISTS "WebhookEvent_businessId_stage_idx" ON "WebhookEvent"("businessId", "stage");
    ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 9. Add new columns to AppConfig that might not exist yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AppConfig' AND column_name='creatorGenerationEnabled') THEN
    ALTER TABLE "AppConfig" ADD COLUMN "creatorGenerationEnabled" BOOLEAN NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AppConfig' AND column_name='seoKeywordEnabled') THEN
    ALTER TABLE "AppConfig" ADD COLUMN "seoKeywordEnabled" BOOLEAN NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AppConfig' AND column_name='seoKeywordList') THEN
    ALTER TABLE "AppConfig" ADD COLUMN "seoKeywordList" TEXT NOT NULL DEFAULT '';
  END IF;
  -- Threads Scout
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AppConfig' AND column_name='threadsScoutEnabled') THEN
    ALTER TABLE "AppConfig" ADD COLUMN "threadsScoutEnabled" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AppConfig' AND column_name='threadsScoutKeywords') THEN
    ALTER TABLE "AppConfig" ADD COLUMN "threadsScoutKeywords" TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AppConfig' AND column_name='threadsScoutPersona') THEN
    ALTER TABLE "AppConfig" ADD COLUMN "threadsScoutPersona" TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AppConfig' AND column_name='threadsScoutSellAngle') THEN
    ALTER TABLE "AppConfig" ADD COLUMN "threadsScoutSellAngle" TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AppConfig' AND column_name='threadsScoutLimitPerKeyword') THEN
    ALTER TABLE "AppConfig" ADD COLUMN "threadsScoutLimitPerKeyword" TEXT NOT NULL DEFAULT '20';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AppConfig' AND column_name='threadsScoutMaxRepliesPerRun') THEN
    ALTER TABLE "AppConfig" ADD COLUMN "threadsScoutMaxRepliesPerRun" TEXT NOT NULL DEFAULT '5';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='AppConfig' AND column_name='threadsScoutRepliedIds') THEN
    ALTER TABLE "AppConfig" ADD COLUMN "threadsScoutRepliedIds" TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

COMMIT;
