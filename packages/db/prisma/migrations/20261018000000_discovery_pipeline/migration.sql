CREATE TYPE "OpportunityCategory" AS ENUM ('JOB', 'BOUNTY', 'GRANT', 'HACKATHON', 'CONTRIBUTOR_REQUEST', 'SIGNAL');
CREATE TYPE "OpportunityConfidence" AS ENUM ('CONFIRMED', 'SPECULATIVE', 'STALE');

ALTER TABLE "Opportunity"
  ADD COLUMN "category" "OpportunityCategory" NOT NULL DEFAULT 'SIGNAL',
  ADD COLUMN "confidence" "OpportunityConfidence" NOT NULL DEFAULT 'SPECULATIVE',
  ADD COLUMN "sourceQuality" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "isStale" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Opportunity_category_isStale_publishedAt_idx" ON "Opportunity"("category", "isStale", "publishedAt");
CREATE INDEX "Opportunity_discoveredAt_idx" ON "Opportunity"("discoveredAt");

CREATE TABLE "SourceHealth" (
  "id" TEXT NOT NULL,
  "source" "OpportunitySource" NOT NULL,
  "lastSuccessAt" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "lastError" TEXT,
  "fetchedCount" INTEGER NOT NULL DEFAULT 0,
  "createdCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SourceHealth_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SourceHealth_source_key" ON "SourceHealth"("source");