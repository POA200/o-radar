import { prisma } from "@o-radar/db";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { PageHeading } from "@/components/shared/page-heading";
import { OpportunityFeedView } from "@/components/opportunity/opportunity-feed-view";
import { requireOnboardedUser } from "../../src/require-user";
import { matchOpportunity } from "../../src/lib/match-opportunity";

export const dynamic = "force-dynamic";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireOnboardedUser();
  const params = await searchParams;

  const [activeLeadsCount, latestSync, opportunitiesRaw] = await Promise.all([
    prisma.lead.count({
      where: { userId: user.id, status: { not: "ARCHIVED" } },
    }),
    prisma.opportunity.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.opportunity.findMany({
      where: {
        leads: {
          none: { userId: user.id, status: "ARCHIVED" },
        },
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 120,
      include: {
        evidences: {
          orderBy: { capturedAt: "desc" },
          take: 1,
        },
        leads: {
          where: { userId: user.id },
          select: {
            id: true,
            status: true,
          },
        },
      },
    }),
  ]);

  const matched = opportunitiesRaw.map((opp) => {
    const match = matchOpportunity(
      {
        niche: user.niche,
        targetRoles: user.targetRoles,
        targetChains: user.targetChains,
        skills: user.skills,
        cvText: user.cvText,
      },
      {
        title: opp.title,
        content: opp.content,
        source: opp.source,
        score: opp.score,
      },
    );

    const isSaved = opp.leads.some(
      (l) => l.status === "QUALIFIED" || l.status === "CONTACTED",
    );

    return {
      id: opp.id,
      title: opp.title,
      source: opp.source,
      url: opp.url,
      content: opp.content,
      score: opp.score,
      category: opp.category,
      confidence: opp.confidence,
      sourceQuality: opp.sourceQuality,
      // Use structured personal match scores
      matchScore: match.personal.score,
      matchReasons: match.personal.reasons,
      createdAt: opp.createdAt.toISOString(),
      publishedAt: opp.publishedAt?.toISOString() ?? null,
      evidence: opp.evidences[0]?.rawPayload ?? {},
      saved: isSaved,
    };
  });

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        niche: user.niche,
      }}
      lastSyncTime={latestSync?.createdAt}
      activeLeadsCount={activeLeadsCount}
    >
      <div className="py-6 sm:py-8">
        <ResponsiveContainer size="wide" className="space-y-6">
          <PageHeading
            title="Discover Opportunities"
            description="Explore bounties, grants, gigs, and early project signals across technical Web3 ecosystems."
            eyebrow="Intelligence Feed"
          />

          <OpportunityFeedView
            opportunities={matched}
            initialFilters={{
              search: typeof params.q === "string" ? params.q : undefined,
              type: typeof params.type === "string" ? params.type : undefined,
              confidence:
                typeof params.confidence === "string"
                  ? params.confidence
                  : undefined,
            }}
            showHuntControl={true}
          />
        </ResponsiveContainer>
      </div>
    </AppShell>
  );
}
