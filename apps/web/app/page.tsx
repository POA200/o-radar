import { prisma } from "@o-radar/db";
import Link from "next/link";
import {
  Compass,
  Briefcase,
  Radar,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Bookmark,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { PageHeading } from "@/components/shared/page-heading";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { OpportunityFeedView } from "@/components/opportunity/opportunity-feed-view";
import { requireOnboardedUser } from "../src/require-user";
import { matchOpportunity, compareOpportunities } from "../src/lib/match-opportunity";
import { classifyOpportunity } from "../src/lib/opportunity-classifier";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const user = await requireOnboardedUser();

  // 1. Compute REAL metrics from Prisma database
  const [
    totalOpportunities,
    activeLeadsCount,
    qualifiedLeadsCount,
    convertedLeadsCount,
    latestSync,
  ] = await Promise.all([
    prisma.opportunity.count(),
    prisma.lead.count({
      where: { userId: user.id, status: { not: "ARCHIVED" } },
    }),
    prisma.lead.count({
      where: { userId: user.id, status: { in: ["QUALIFIED", "CONTACTED"] } },
    }),
    prisma.lead.count({ where: { userId: user.id, status: "CONVERTED" } }),
    prisma.opportunity.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  // 2. Fetch opportunities (excluding archived ones)
  const opportunitiesRaw = await prisma.opportunity.findMany({
    where: {
      leads: {
        none: { userId: user.id, status: "ARCHIVED" },
      },
    },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 60,
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
  });

  // 3. Compute personalized match score for each opportunity
  const matchedOpportunities = opportunitiesRaw.map((opp) => {
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
      _match: match,
    };
  });

  // 4. Top Profile Matches (sorted by personal, credibility, then freshness)
  const topMatches = [...matchedOpportunities]
  .sort((a, b) => compareOpportunities(a._match, b._match))
  .slice(0, 4)
  .map(({ _match, ...rest }) => rest);

  // 5. Fetch High-Priority Leads that need follow up
  const priorityLeads = await prisma.lead.findMany({
    where: { userId: user.id, status: { in: ["QUALIFIED", "CONTACTED"] } },
    orderBy: { updatedAt: "desc" },
    take: 4,
    include: {
      opportunity: {
        select: {
          id: true,
          title: true,
          url: true,
          score: true,
        },
      },
    },
  });

  // High match signals count (> 40% match)
  const highMatchCount = matchedOpportunities.filter(
    (o) => o.matchScore >= 40,
  ).length;

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
        <ResponsiveContainer size="wide" className="space-y-8">
          {/* Page Greeting & Summary */}
          <PageHeading
            title={`Welcome back, ${user.name?.split(" ")[0] || "Builder"}`}
            description={
              user.niche
                ? `Tracking intelligence tailored for: ${user.niche}`
                : "Personal opportunity intelligence across verified Web3 ecosystems."
            }
            eyebrow="Intelligence Dashboard"
            badge={
              <Badge
                variant="outline"
                className="border-primary/40 bg-primary/10 text-primary font-mono text-[10px]"
              >
                Active Radar
              </Badge>
            }
            actions={
              <Button
                asChild
                variant="default"
                size="sm"
                className="gap-1.5 font-mono text-xs"
              >
                <Link href="/discover">
                  <Compass className="size-3.5" />
                  <span>Explore Discover</span>
                </Link>
              </Button>
            }
          />

          {/* Metric Cards (100% computed from real database state) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="bg-card/60 border-border/80">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
                  <span>Tracked Signals</span>
                  <Radar className="size-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-foreground">
                  {totalOpportunities}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Persisted in discovery cache
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/80">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
                  <span>Profile Matches</span>
                  <Sparkles className="size-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-primary">
                  {highMatchCount}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Signals matching role & niche
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/80">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
                  <span>Active Leads</span>
                  <Briefcase className="size-4 text-amber-400" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-foreground">
                  {activeLeadsCount}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {qualifiedLeadsCount} qualified or in review
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/80">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
                  <span>Converted Work</span>
                  <CheckCircle2 className="size-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-foreground">
                  {convertedLeadsCount}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Successful engagements
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Grid Layout: Top Matches & High-Priority Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Top Profile Matches */}
            <div className="lg:col-span-2 space-y-4">
              <SectionHeading
                title="Top Profile Matches"
                description="Opportunities best matching your preferred roles, ecosystems, and skills"
                eyebrow="High Fit Radar"
                actions={
                  <Button
                    asChild
                    variant="ghost"
                    size="xs"
                    className="gap-1 text-xs text-primary"
                  >
                    <Link href="/discover">
                      <span>View All</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                }
              />

              {topMatches.length === 0 ? (
                <EmptyState
                  icon={Radar}
                  title="No matched opportunities yet"
                  description="Run discovery or configure your preferred roles and chains in Settings to start receiving personalized matches."
                  action={
                    <Button asChild size="sm" variant="outline">
                      <Link href="/settings">Configure Preferences</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <OpportunityFeedView
                    opportunities={topMatches}
                    showHuntControl={false}
                  />
                </div>
              )}
            </div>

            {/* Right 1 Col: Pipeline & Follow-ups */}
            <div className="space-y-4">
              <SectionHeading
                title="Active Leads"
                description="Opportunities needing outreach or review"
                eyebrow="Pipeline Queue"
                actions={
                  <Button
                    asChild
                    variant="ghost"
                    size="xs"
                    className="gap-1 text-xs text-primary"
                  >
                    <Link href="/leads">
                      <span>Manage</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                }
              />

              {priorityLeads.length === 0 ? (
                <Card className="bg-card/40 border-dashed border-border/80">
                  <CardContent className="p-6 text-center space-y-2">
                    <Bookmark className="size-5 text-muted-foreground mx-auto" />
                    <p className="text-xs font-medium text-foreground">
                      No active leads in pipeline
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Save opportunities from the Discover feed to organize your
                      outreach.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {priorityLeads.map((lead) => (
                    <Card
                      key={lead.id}
                      className="bg-card/60 border-border/80 hover:border-border transition-colors"
                    >
                      <CardContent className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-foreground truncate">
                            @{lead.handle}
                          </span>
                          <StatusBadge status={lead.status} />
                        </div>
                        <a
                          href={lead.opportunity.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary line-clamp-1 block transition-colors"
                        >
                          {lead.opportunity.title}
                        </a>
                        {lead.notes && (
                          <p className="text-[11px] text-muted-foreground/80 font-mono bg-secondary/50 rounded px-2 py-1 line-clamp-2">
                            {lead.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Source Inventory Card */}
              <Card className="bg-secondary/20 border-border/80">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
                    Source Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="text-foreground">
                      GitHub Issues Scraper
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-[9px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                    >
                      Operational
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="text-foreground">Ecosystem RSS Feeds</span>
                    <Badge
                      variant="outline"
                      className="font-mono text-[9px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                    >
                      Operational
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Web3 Job Boards
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-[9px] text-muted-foreground border-border"
                    >
                      Phase 3
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ResponsiveContainer>
      </div>
    </AppShell>
  );
}
