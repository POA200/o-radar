import { prisma } from "@o-radar/db";
import Link from "next/link";
import { Bookmark, Compass } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { PageHeading } from "@/components/shared/page-heading";
import { OpportunityFeedView } from "@/components/opportunity/opportunity-feed-view";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { requireOnboardedUser } from "../../src/require-user";
import { matchOpportunity } from "../../src/lib/match-opportunity";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await requireOnboardedUser();

  const [activeLeadsCount, latestSync, savedOpportunitiesRaw] =
    await Promise.all([
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
            some: {
              userId: user.id,
              status: { in: ["QUALIFIED", "CONTACTED", "CONVERTED"] },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
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

  const matched = savedOpportunitiesRaw.map((opp) => {
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
      matchScore: match.score,
      matchReasons: match.reasons,
      createdAt: opp.createdAt.toISOString(),
      publishedAt: opp.publishedAt?.toISOString() ?? null,
      evidence: opp.evidences[0]?.rawPayload ?? {},
      saved: true,
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
            title="Saved Opportunities"
            description="Bookmarked opportunities and qualified signals saved for outreach or execution."
            eyebrow="My Workspace"
          />

          {matched.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="No saved opportunities yet"
              description="Save opportunities from the Discover feed to build your personal priority queue."
              action={
                <Button asChild variant="default" size="sm">
                  <Link href="/discover">
                    <Compass className="size-3.5 mr-1.5" />
                    <span>Explore Discover Feed</span>
                  </Link>
                </Button>
              }
            />
          ) : (
            <OpportunityFeedView
              opportunities={matched}
              showHuntControl={false}
            />
          )}
        </ResponsiveContainer>
      </div>
    </AppShell>
  );
}
