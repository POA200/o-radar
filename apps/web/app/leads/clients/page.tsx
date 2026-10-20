import { prisma } from "@o-radar/db";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { PageHeading } from "@/components/shared/page-heading";
import { requireOnboardedUser } from "../../../src/require-user";
import Link from "next/link";
import { scoreProspect } from "@/lib/prospect-score";
import { ExternalLink, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PotentialClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireOnboardedUser();
  const params = await searchParams;
  const filter = typeof params.filter === "string" ? params.filter : "all";
  const chain = typeof params.chain === "string" ? params.chain : "all";
  const source = typeof params.source === "string" ? params.source : "all";
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";

  const leads = await prisma.listingLead.findMany({ orderBy: [{ priority: "desc" }, { updatedAt: "desc" }] });
  const chains = Array.from(new Set(leads.map((l) => l.chain).filter(Boolean))) as string[];
  const sources = Array.from(new Set(leads.map((l) => l.discoverySource))) as string[];

  const filtered = leads.filter((l) => {
    if (q && !l.projectName.toLowerCase().includes(q) && !(l.tokenSymbol ?? "").toLowerCase().includes(q)) return false;
    if (chain !== "all" && l.chain !== chain) return false;
    if (source !== "all" && l.discoverySource !== source) return false;
    const hasWebsite = !!l.websiteUrl;
    const hasSocial = !!(l.xUrl || l.telegramUrl || l.discordUrl);
    if (filter === "no-website" && hasWebsite) return false;
    if (filter === "has-x" && !l.xUrl) return false;
    if (filter === "has-telegram-discord" && !l.telegramUrl && !l.discordUrl) return false;
    if (filter === "no-website-has-social" && !( !hasWebsite && hasSocial )) return false;
    return true;
  });

  const activeLeadsCount = await prisma.lead.count({ where: { userId: user.id, status: { not: "ARCHIVED" } } });
  const noWebsiteCount = leads.filter((l) => !l.websiteUrl).length;
  const withSocialCount = leads.filter((l) => l.xUrl || l.telegramUrl || l.discordUrl).length;

  return (
    <AppShell user={{ name: user.name, email: user.email, image: user.image, niche: user.niche }} activeLeadsCount={activeLeadsCount}>
      <div className="py-6 sm:py-8">
        <ResponsiveContainer size="wide" className="space-y-6">
          <PageHeading title="Potential Clients" description="Discovered projects to research as potential clients for website, UI/UX, and branding work. These are prospects, not confirmed job listings." eyebrow="Prospecting" />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/40 bg-card/60 p-3 text-sm">
              <div className="text-muted-foreground text-xs">Total projects</div>
              <div className="text-xl font-semibold">{leads.length}</div>
            </div>
            <div className="rounded-lg border border-border/40 bg-card/60 p-3 text-sm">
              <div className="text-muted-foreground text-xs">Missing website</div>
              <div className="text-xl font-semibold">{noWebsiteCount}</div>
            </div>
            <div className="rounded-lg border border-border/40 bg-card/60 p-3 text-sm">
              <div className="text-muted-foreground text-xs">With social links</div>
              <div className="text-xl font-semibold">{withSocialCount}</div>
            </div>
          </div>

          <form method="get" className="flex flex-wrap gap-2 items-end">
            <input name="q" defaultValue={q} placeholder="Search projects..." className="h-8 text-xs rounded border border-border bg-secondary/50 px-2" />
            <select name="filter" defaultValue={filter} className="h-8 text-xs rounded border border-border bg-secondary/50 px-2">
              <option value="all">All</option>
              <option value="no-website">Missing website</option>
              <option value="has-x">Has X</option>
              <option value="has-telegram-discord">Has Telegram/Discord</option>
              <option value="no-website-has-social">No website + social</option>
            </select>
            <select name="chain" defaultValue={chain} className="h-8 text-xs rounded border border-border bg-secondary/50 px-2">
              <option value="all">All chains</option>
              {chains.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select name="source" defaultValue={source} className="h-8 text-xs rounded border border-border bg-secondary/50 px-2">
              <option value="all">All sources</option>
              {sources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="submit" className="h-8 text-xs px-3 rounded bg-primary text-primary-foreground">Apply</button>
            <a href="/leads/clients" className="h-8 text-xs px-3 rounded border border-border flex items-center">Reset</a>
          </form>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((l) => {
              const sc = scoreProspect({
                chain: l.chain,
                tokenAddress: l.contractAddress,
                projectName: l.projectName,
                tokenSymbol: l.tokenSymbol,
                websiteUrl: l.websiteUrl,
                xUrl: l.xUrl,
                telegramUrl: l.telegramUrl,
                discordUrl: l.discordUrl,
                sourceUrl: l.sourceUrl,
                volume24hUsd: l.volume24hUsd,
                liquidityUsd: null,
                marketCap: null,
                marketCapSource: null,
                priceUsd: null,
                description: null,
              });
              const hasWebsite = !!l.websiteUrl;
              const hasSocial = !!(l.xUrl || l.telegramUrl || l.discordUrl);
              const reason = !hasWebsite && hasSocial ? "No website recorded; social account available." : hasWebsite ? "Website recorded; may still need product interface work." : "No website or social links recorded.";
              return (
                <div key={l.id} className="rounded-lg border border-border/40 bg-card/60 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{l.projectName}</div>
                      <div className="text-xs text-muted-foreground">{l.tokenSymbol ?? "—"} · {l.chain ?? "—"}</div>
                    </div>
                    <span className="text-xs rounded bg-secondary/60 px-2 py-0.5">{sc.score} · {sc.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{l.discoverySource}</div>
                  <div className="flex gap-2 text-xs">
                    {l.websiteUrl && <a href={l.websiteUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Web</a>}
                    {l.xUrl && <a href={l.xUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">X</a>}
                    {l.telegramUrl && <a href={l.telegramUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">TG</a>}
                    {l.discordUrl && <a href={l.discordUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">DC</a>}
                  </div>
                  <div className="text-xs text-muted-foreground">24h vol: {l.volume24hUsd != null ? `$${l.volume24hUsd.toLocaleString()}` : "N/A"}</div>
                  <div className="text-xs text-muted-foreground">{reason}</div>
                  <Link href={`/listing-leads/${l.id}`} className="text-xs text-primary hover:underline">View research</Link>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground">No potential clients match the filters.</p>}
          </div>
        </ResponsiveContainer>
      </div>
    </AppShell>
  );
}
