import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  Bookmark,
  Building2,
  Calendar,
  Clock,
  Coins,
  ExternalLink,
  GitPullRequest,
  Rss,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { prisma } from "@o-radar/db";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { PageHeading } from "@/components/shared/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { classifyOpportunity } from "@/src/lib/opportunity-classifier";
import { requireOnboardedUser } from "../../../src/require-user";
import { OpportunityDetailActions } from "../../../components/opportunity/opportunity-detail-actions";

export const dynamic = "force-dynamic";

export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      evidences: { orderBy: { capturedAt: "desc" }, take: 1 },
      leads: { where: { userId: user.id }, select: { status: true } },
    },
  });

  if (!opportunity) notFound();

  const classified = classifyOpportunity(
    opportunity.title,
    opportunity.content,
    opportunity.url,
    opportunity.publishedAt ?? opportunity.createdAt,
    opportunity.evidences[0]?.rawPayload,
  );
  const category = opportunity.category ?? classified.type;
  const confidence = opportunity.confidence ?? classified.confidence;
  const saved = opportunity.leads.some((lead) =>
    ["QUALIFIED", "CONTACTED", "CONVERTED"].includes(lead.status),
  );
  const sourceIcon = opportunity.source === "RSS_FEED" ? Rss : GitPullRequest;
  const SourceIcon = sourceIcon;

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        niche: user.niche,
      }}
      activeLeadsCount={await prisma.lead.count({
        where: { userId: user.id, status: { not: "ARCHIVED" } },
      })}
      lastSyncTime={opportunity.discoveredAt}
    >
      <div className="py-6 sm:py-8">
        <ResponsiveContainer size="wide" className="space-y-6">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-fit gap-1.5 px-0 text-muted-foreground"
          >
            <Link href="/discover">
              <ArrowLeft className="size-4" />
              Back to discover
            </Link>
          </Button>

          <PageHeading
            title={opportunity.title}
            description="Review the evidence, source quality, and profile match before deciding what to do next."
            eyebrow="Opportunity Detail"
            badge={
              <Badge
                variant="outline"
                className="uppercase font-mono text-[10px]"
              >
                {category}
              </Badge>
            }
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <Card>
                <CardHeader className="border-b border-border/60">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono">
                    <Badge variant="outline" className="gap-1 uppercase">
                      <SourceIcon className="size-3" />
                      {opportunity.source.replaceAll("_", " ")}
                    </Badge>
                    <Badge variant="outline" className="gap-1 uppercase">
                      {confidence === "CONFIRMED" ? (
                        <ShieldCheck className="size-3 text-emerald-400" />
                      ) : confidence === "STALE" ? (
                        <AlertTriangle className="size-3" />
                      ) : (
                        <HelpCircle className="size-3 text-amber-400" />
                      )}
                      {confidence}
                    </Badge>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDate(
                        opportunity.publishedAt ?? opportunity.discoveredAt,
                      )}
                    </span>
                  </div>
                  <CardTitle className="text-base">
                    Opportunity evidence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 p-5">
                  {(classified.reward || classified.deadline) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {classified.reward && (
                        <InfoBlock
                          icon={Coins}
                          label="Reward / budget"
                          value={classified.reward}
                          accent
                        />
                      )}
                      {classified.deadline && (
                        <InfoBlock
                          icon={Calendar}
                          label="Application deadline"
                          value={classified.deadline}
                        />
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                      Original content
                    </h2>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                      {opportunity.content ||
                        "No body content captured for this record."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Raw evidence</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-[480px] overflow-auto rounded-md bg-[#05080c] p-4 font-mono text-[11px] leading-relaxed text-emerald-400/90">
                    {JSON.stringify(
                      opportunity.evidences[0]?.rawPayload ?? {},
                      null,
                      2,
                    )}
                  </pre>
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-sm">
                    <Sparkles className="size-4 text-primary" />
                    Profile match
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-3xl font-mono font-bold text-primary">
                    {opportunity.score}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      signal score
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {classified.tags.map((tag) => (
                      <span
                        key={tag}
                        className="mr-1.5 inline-block rounded bg-secondary px-2 py-1"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    Source quality:{" "}
                    <strong className="text-foreground">
                      {opportunity.sourceQuality}/100
                    </strong>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Source</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <Building2 className="mt-0.5 size-3.5 shrink-0" />
                    {classified.organization ??
                      opportunity.source.replaceAll("_", " ")}
                  </p>
                  <Button asChild className="w-full gap-1.5" size="sm">
                    <a href={opportunity.url} target="_blank" rel="noreferrer">
                      Open original <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
              <OpportunityDetailActions
                opportunityId={opportunity.id}
                saved={saved}
              />
            </aside>
          </div>
        </ResponsiveContainer>
      </div>
    </AppShell>
  );
}

function formatDate(value: Date) {
  return value.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function InfoBlock({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/40"}`}
    >
      <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </span>
      <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}
