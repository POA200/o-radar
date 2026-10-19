-- CreateEnum
CREATE TYPE "ListingDiscoverySource" AS ENUM ('DEX_SCREENER', 'COIN_GECKO', 'COIN_MARKET_CAP', 'LAUNCHPAD', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingLeadStatus" AS ENUM ('DISCOVERED', 'RESEARCHING', 'QUALIFIED', 'CONTACTED', 'REPLIED', 'IN_PROGRESS', 'WON', 'LOST', 'CONVERTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ListingLead" (
    "id" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "chain" TEXT,
    "contractAddress" TEXT,
    "websiteUrl" TEXT,
    "xUrl" TEXT,
    "telegramUrl" TEXT,
    "discordUrl" TEXT,
    "discoverySource" "ListingDiscoverySource" NOT NULL DEFAULT 'MANUAL',
    "sourceUrl" TEXT,
    "volume24hUsd" DOUBLE PRECISION,
    "holderCount" INTEGER,
    "listingStatus" "ListingLeadStatus" NOT NULL DEFAULT 'DISCOVERED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactTelegram" TEXT,
    "notes" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListingLead_chain_contractAddress_key" ON "ListingLead"("chain", "contractAddress");

-- CreateIndex
CREATE INDEX "ListingLead_listingStatus_idx" ON "ListingLead"("listingStatus");

-- CreateIndex
CREATE INDEX "ListingLead_chain_idx" ON "ListingLead"("chain");

-- CreateIndex
CREATE INDEX "ListingLead_priority_idx" ON "ListingLead"("priority");

-- CreateIndex
CREATE INDEX "ListingLead_createdAt_idx" ON "ListingLead"("createdAt");
