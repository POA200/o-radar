import type { OpportunitySource, PrismaClient } from "@prisma/client";

export type IngestionCounts = {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
};

export type SourceAdapter = {
  id: string;
  source: OpportunitySource;
  run(): Promise<IngestionCounts>;
};

export async function recordSourceHealth(
  prisma: PrismaClient,
  source: OpportunitySource,
  counts: IngestionCounts,
  error?: unknown,
) {
  await prisma.sourceHealth.upsert({
    where: { source },
    create: {
      source,
      lastAttemptAt: new Date(),
      lastSuccessAt: error ? null : new Date(),
      lastError: error instanceof Error ? error.message.slice(0, 500) : null,
      fetchedCount: counts.fetched,
      createdCount: counts.created,
      updatedCount: counts.updated,
      skippedCount: counts.skipped,
      failedCount: counts.failed,
    },
    update: {
      lastAttemptAt: new Date(),
      ...(error ? { lastError: error instanceof Error ? error.message.slice(0, 500) : "Source failed" } : { lastSuccessAt: new Date(), lastError: null }),
      fetchedCount: counts.fetched,
      createdCount: counts.created,
      updatedCount: counts.updated,
      skippedCount: counts.skipped,
      failedCount: counts.failed,
    },
  });
}