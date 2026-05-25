-- Multi-tenant migration: introduces Business and scopes all existing tables to a businessId.
-- Existing single-tenant data is migrated under a default business "Citra Digital Hotel".

-- 1. Business table
CREATE TABLE IF NOT EXISTS "Business" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "niche" TEXT NOT NULL DEFAULT '',
  "brandSummary" TEXT NOT NULL DEFAULT '',
  "audience" TEXT NOT NULL DEFAULT '',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Business_slug_key" ON "Business"("slug");
CREATE INDEX IF NOT EXISTS "Business_isDefault_idx" ON "Business"("isDefault");

-- 2. Seed default business if not exists
DO $$
DECLARE
  default_id TEXT;
BEGIN
  SELECT "id" INTO default_id FROM "Business" WHERE "isDefault" = true LIMIT 1;

  IF default_id IS NULL THEN
    default_id := gen_random_uuid()::text;
    INSERT INTO "Business" ("id", "slug", "name", "niche", "brandSummary", "audience", "isDefault", "createdAt", "updatedAt")
    VALUES (
      default_id,
      'citra-digital-hotel',
      'Citra Digital Hotel',
      'Direct booking hotel, website hotel yang konversi, AI customer service, dan digital marketing hospitality',
      'Citra Digital Hotel membantu hotel, villa, resort, dan penginapan meningkatkan direct booking lewat website yang fokus konversi, AI customer service, serta strategi digital yang praktis dan terukur.',
      'Owner hotel, villa, resort, penginapan, dan tim marketing hospitality yang ingin menaikkan direct booking, mengurangi ketergantungan OTA, dan mempercepat closing dari WhatsApp atau website.',
      true,
      NOW(),
      NOW()
    );
  END IF;
END $$;

-- 3. AppConfig: change PK from fixed id=1 to autoincrement and add businessId.
--    Drop old PK, add businessId, link to default business, then unique-constrain businessId.
ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "businessId" TEXT;

UPDATE "AppConfig"
SET "businessId" = (SELECT "id" FROM "Business" WHERE "isDefault" = true LIMIT 1)
WHERE "businessId" IS NULL;

ALTER TABLE "AppConfig" ALTER COLUMN "businessId" SET NOT NULL;

-- Drop legacy fixed-id constraint and replace with autoincrement default + unique businessId
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'AppConfig_id_seq'
  ) IS FALSE THEN
    CREATE SEQUENCE "AppConfig_id_seq";
  END IF;
END $$;

ALTER TABLE "AppConfig" ALTER COLUMN "id" SET DEFAULT nextval('"AppConfig_id_seq"');
ALTER SEQUENCE "AppConfig_id_seq" OWNED BY "AppConfig"."id";
SELECT setval('"AppConfig_id_seq"', GREATEST((SELECT COALESCE(MAX("id"), 0) FROM "AppConfig"), 1));

CREATE UNIQUE INDEX IF NOT EXISTS "AppConfig_businessId_key" ON "AppConfig"("businessId");
CREATE INDEX IF NOT EXISTS "AppConfig_waSessionId_idx" ON "AppConfig"("waSessionId");

ALTER TABLE "AppConfig"
  DROP CONSTRAINT IF EXISTS "AppConfig_businessId_fkey";
ALTER TABLE "AppConfig"
  ADD CONSTRAINT "AppConfig_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. AdminUser
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "businessId" TEXT;

UPDATE "AdminUser"
SET "businessId" = (SELECT "id" FROM "Business" WHERE "isDefault" = true LIMIT 1)
WHERE "businessId" IS NULL;

ALTER TABLE "AdminUser" ALTER COLUMN "businessId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "AdminUser_businessId_idx" ON "AdminUser"("businessId");

ALTER TABLE "AdminUser"
  DROP CONSTRAINT IF EXISTS "AdminUser_businessId_fkey";
ALTER TABLE "AdminUser"
  ADD CONSTRAINT "AdminUser_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. MessageLog
ALTER TABLE "MessageLog" ADD COLUMN IF NOT EXISTS "businessId" TEXT;

UPDATE "MessageLog"
SET "businessId" = (SELECT "id" FROM "Business" WHERE "isDefault" = true LIMIT 1)
WHERE "businessId" IS NULL;

ALTER TABLE "MessageLog" ALTER COLUMN "businessId" SET NOT NULL;

DROP INDEX IF EXISTS "MessageLog_createdAt_idx";
DROP INDEX IF EXISTS "MessageLog_fromPhone_idx";
CREATE INDEX IF NOT EXISTS "MessageLog_businessId_createdAt_idx" ON "MessageLog"("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "MessageLog_businessId_fromPhone_idx" ON "MessageLog"("businessId", "fromPhone");

ALTER TABLE "MessageLog"
  DROP CONSTRAINT IF EXISTS "MessageLog_businessId_fkey";
ALTER TABLE "MessageLog"
  ADD CONSTRAINT "MessageLog_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. MemorySession: change PK from (phone) to composite (businessId, phone)
ALTER TABLE "MemorySession" ADD COLUMN IF NOT EXISTS "businessId" TEXT;

UPDATE "MemorySession"
SET "businessId" = (SELECT "id" FROM "Business" WHERE "isDefault" = true LIMIT 1)
WHERE "businessId" IS NULL;

ALTER TABLE "MemorySession" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "MemoryMessage" DROP CONSTRAINT IF EXISTS "MemoryMessage_phone_fkey";
ALTER TABLE "MemorySession" DROP CONSTRAINT IF EXISTS "MemorySession_pkey";

ALTER TABLE "MemorySession"
  ADD CONSTRAINT "MemorySession_pkey" PRIMARY KEY ("businessId", "phone");

DROP INDEX IF EXISTS "MemorySession_lastActive_idx";
CREATE INDEX IF NOT EXISTS "MemorySession_businessId_lastActive_idx" ON "MemorySession"("businessId", "lastActive");

ALTER TABLE "MemorySession"
  DROP CONSTRAINT IF EXISTS "MemorySession_businessId_fkey";
ALTER TABLE "MemorySession"
  ADD CONSTRAINT "MemorySession_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. MemoryMessage: add businessId and re-link FK to composite key
ALTER TABLE "MemoryMessage" ADD COLUMN IF NOT EXISTS "businessId" TEXT;

UPDATE "MemoryMessage"
SET "businessId" = (SELECT "id" FROM "Business" WHERE "isDefault" = true LIMIT 1)
WHERE "businessId" IS NULL;

ALTER TABLE "MemoryMessage" ALTER COLUMN "businessId" SET NOT NULL;

DROP INDEX IF EXISTS "MemoryMessage_phone_createdAt_idx";
CREATE INDEX IF NOT EXISTS "MemoryMessage_businessId_phone_createdAt_idx" ON "MemoryMessage"("businessId", "phone", "createdAt");

ALTER TABLE "MemoryMessage"
  ADD CONSTRAINT "MemoryMessage_session_fkey"
  FOREIGN KEY ("businessId", "phone") REFERENCES "MemorySession"("businessId", "phone") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MemoryMessage"
  ADD CONSTRAINT "MemoryMessage_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. WebhookEvent
ALTER TABLE "WebhookEvent" ADD COLUMN IF NOT EXISTS "businessId" TEXT;

UPDATE "WebhookEvent"
SET "businessId" = (SELECT "id" FROM "Business" WHERE "isDefault" = true LIMIT 1)
WHERE "businessId" IS NULL;

ALTER TABLE "WebhookEvent" ALTER COLUMN "businessId" SET NOT NULL;

DROP INDEX IF EXISTS "WebhookEvent_createdAt_idx";
DROP INDEX IF EXISTS "WebhookEvent_stage_idx";
CREATE INDEX IF NOT EXISTS "WebhookEvent_businessId_createdAt_idx" ON "WebhookEvent"("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "WebhookEvent_businessId_stage_idx" ON "WebhookEvent"("businessId", "stage");

ALTER TABLE "WebhookEvent"
  DROP CONSTRAINT IF EXISTS "WebhookEvent_businessId_fkey";
ALTER TABLE "WebhookEvent"
  ADD CONSTRAINT "WebhookEvent_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
