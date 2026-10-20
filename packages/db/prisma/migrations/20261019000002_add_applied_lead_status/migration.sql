-- Add APPLIED to LeadStatus and appliedAt column
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'APPLIED';
ALTER TABLE "Lead" ADD COLUMN "appliedAt" TIMESTAMP(3);
