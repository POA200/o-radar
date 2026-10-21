ALTER TABLE "ListingLead" ADD COLUMN "userId" TEXT;
ALTER TABLE "ListingLead" ADD CONSTRAINT "ListingLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "ListingLead_chain_contractAddress_key";
CREATE UNIQUE INDEX "ListingLead_userId_chain_contractAddress_key" ON "ListingLead"("userId", "chain", "contractAddress");
CREATE INDEX "ListingLead_userId_idx" ON "ListingLead"("userId");
