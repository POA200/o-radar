import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@o-radar/db";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireOnboardedUser } from "../../../src/require-user";
import { ListingLeadEditor } from "@/components/listing-lead/listing-lead-editor";
import { EnrichMetadataButton } from "@/components/listing-lead/enrich-metadata";
import { LiveMarketDataCard } from "@/components/listing-lead/live-market-data";
import { listingLeadStatusLabel } from "@/lib/listing-lead-status";
import { scoreProspect } from "@/lib/prospect-score";
import { ExternalLink, ArrowLeft, Copy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ListingLeadResearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const lead = await prisma.listingLead.findUnique({ where: { id } });
  if (!lead) notFound();

  const item = {
    id: lead.id,
    projectName: lead.projectName,
    tokenSymbol: lead.tokenSymbol,
    chain: lead.chain,
    contractAddress: lead.contractAddress,
    websiteUrl: lead.websiteUrl,
    xUrl: lead.xUrl,
    telegramUrl: lead.telegramUrl,
    discordUrl: lead.discordUrl,
    discoverySource: lead.discoverySource,
    sourceUrl: lead.sourceUrl,
    volume24hUsd: lead.volume24hUsd,
    holderCount: lead.holderCount,
    listingStatus: lead.listingStatus,
    priority: lead.priority,
    contactName: lead.contactName,
    contactEmail: lead.contactEmail,
    contactTelegram: lead.contactTelegram,
    notes: lead.notes,
    lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };

  const score = scoreProspect({
    chain: item.chain,
    tokenAddress: item.contractAddress,
    projectName: item.projectName,
    tokenSymbol: item.tokenSymbol,
    websiteUrl: item.websiteUrl,
    xUrl: item.xUrl,
    telegramUrl: item.telegramUrl,
    discordUrl: item.discordUrl,
    sourceUrl: item.sourceUrl,
    volume24hUsd: item.volume24hUsd,
    liquidityUsd: null,
    marketCap: null,
    marketCapSource: null,
    priceUsd: null,
    description: null,
  });

  const activeLeadsCount = await prisma.lead.count({ where: { userId: user.id, status: { not: "ARCHIVED" } } });

  const link = (url: string | null, label: string) =>
    url ? (
      <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
        {label} <ExternalLink className="h-3 w-3" />
      </a>
    ) : (
      <span className="text-muted-foreground">—</span>
    );

  return (
    <AppShell user={{ name: user.name, email: user.email, image: user.image, niche: user.niche }} activeLeadsCount={activeLeadsCount}>
      <div className="py-6 sm:py-8">
        <ResponsiveContainer size="wide" className="space-y-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/listing-leads"><ArrowLeft className="h-4 w-4" /> Back</Link>
            </Button>
          </div>
          <PageHeading title={item.projectName} description={`Research view · ${listingLeadStatusLabel(item.listingStatus)}`} eyebrow="Listing Research" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{item.tokenSymbol ?? "—"}</Badge>
            <Badge variant="outline">{item.chain ?? "—"}</Badge>
            <Badge variant="outline">Priority {item.priority}</Badge>
            <ListingLeadEditor lead={item} />
            <EnrichMetadataButton leadId={item.id} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Project identity</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> {item.projectName}</div>
                <div><span className="text-muted-foreground">Symbol:</span> {item.tokenSymbol ?? "—"}</div>
                <div><span className="text-muted-foreground">Chain:</span> {item.chain ?? "—"}</div>
                <div className="flex items-center gap-2"><span className="text-muted-foreground">Contract:</span> <span className="font-mono text-xs break-all">{item.contractAddress ?? "—"}</span></div>
                <div><span className="text-muted-foreground">Website:</span> {link(item.websiteUrl, "Open")}</div>
                <div><span className="text-muted-foreground">X/Twitter:</span> {link(item.xUrl, "Open")}</div>
                <div><span className="text-muted-foreground">Telegram:</span> {link(item.telegramUrl, "Open")}</div>
                <div><span className="text-muted-foreground">Discord:</span> {link(item.discordUrl, "Open")}</div>
                <div><span className="text-muted-foreground">Discovery source:</span> {item.discoverySource} (from discovery source)</div>
                <div><span className="text-muted-foreground">Source URL:</span> {link(item.sourceUrl, "Open")}</div>
                <div><span className="text-muted-foreground">Created:</span> {new Date(item.createdAt).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Updated:</span> {new Date(item.updatedAt).toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Market snapshot & prospect assessment</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">24h volume:</span> {item.volume24hUsd != null ? `$${item.volume24hUsd.toLocaleString()}` : "N/A (not stored)"}</div>
                <div><span className="text-muted-foreground">Holder count:</span> {item.holderCount != null ? item.holderCount : "N/A (not stored)"}</div>
                <div><span className="text-muted-foreground">Liquidity / Market cap / FDV:</span> Not stored on this model.</div>
                <div><span className="text-muted-foreground">Prospect score:</span> {score.score}/100 — {score.label}</div>
                {score.warnings.length > 0 && <div className="text-xs text-muted-foreground">Warnings: {score.warnings.join(", ")}</div>}
                {score.positives.length > 0 && <div className="text-xs text-muted-foreground">Positives: {score.positives.join(", ")}</div>}
                <p className="text-xs text-muted-foreground pt-2">Heuristic based on available saved data; not proof of listing readiness or ability to pay. Discovery data is not independently verified.</p>
              </CardContent>
            </Card>

            <LiveMarketDataCard chain={item.chain} contractAddress={item.contractAddress} lead={{ notes: item.notes, contactName: item.contactName, contactEmail: item.contactEmail, contactTelegram: item.contactTelegram, websiteUrl: item.websiteUrl, xUrl: item.xUrl, telegramUrl: item.telegramUrl, discordUrl: item.discordUrl, nextFollowUpAt: item.nextFollowUpAt, listingStatus: item.listingStatus }} />
            <Card>
              <CardHeader><CardTitle className="text-sm">Research notes (user-maintained)</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{item.notes || "No notes yet."}</CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Contact & outreach (user-maintained)</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Contact name:</span> {item.contactName ?? "—"}</div>
                <div><span className="text-muted-foreground">Email:</span> {item.contactEmail ?? "—"}</div>
                <div><span className="text-muted-foreground">Telegram:</span> {item.contactTelegram ?? "—"}</div>
                <div><span className="text-muted-foreground">Status:</span> {listingLeadStatusLabel(item.listingStatus)}</div>
                <div><span className="text-muted-foreground">Priority:</span> {item.priority}</div>
                <div><span className="text-muted-foreground">Last contacted:</span> {item.lastContactedAt ? new Date(item.lastContactedAt).toLocaleDateString() : "—"}</div>
                <div><span className="text-muted-foreground">Next follow-up:</span> {item.nextFollowUpAt ? new Date(item.nextFollowUpAt).toLocaleDateString() : "—"}</div>
              </CardContent>
            </Card>
          </div>
        </ResponsiveContainer>
      </div>
    </AppShell>
  );
}
