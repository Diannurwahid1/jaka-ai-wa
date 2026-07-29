ALTER TABLE "AppConfig"
ADD COLUMN "commerceIntegrationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "commerceBaseUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN "commerceSnapshotPath" TEXT NOT NULL DEFAULT '/api/integrations/creator/catalog-snapshot',
ADD COLUMN "commerceIntegrationSecret" TEXT NOT NULL DEFAULT '',
ADD COLUMN "commerceSnapshotMaxAgeMinutes" TEXT NOT NULL DEFAULT '30',
ADD COLUMN "commercePrePublishRevalidation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "commerceStaleDataBehavior" TEXT NOT NULL DEFAULT 'hold';
