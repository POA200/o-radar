"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchLiveMarketData, type LiveMarketData } from "@/app/listing-leads/actions";
import { followUpBucket } from "@/lib/listing-lead-status";

export function LiveMarketDataCard({ chain, contractAddress, lead }: { chain: string | null; contractAddress: string | null; lead: { notes: string | null; contactName: string | null; contactEmail: string | null; contactTelegram: string | null; websiteUrl: string | null; xUrl: string | null; telegramUrl: string | null; discordUrl: string | null; nextFollowUpAt: string | null; listingStatus: string } }) {
  const [provider, setProvider] = React.useState<"dex" | "gecko">("dex");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<LiveMarketData | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLiveMarketData({ provider, chain, contractAddress });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch market data");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v: number | null) => (v == null ? "Unavailable" : `$${v.toLocaleString()}`);

  const hasNotes = !!(lead.notes && lead.notes.trim());
  const hasContact = !!(lead.contactName || lead.contactEmail || lead.contactTelegram);
  const hasSocial = !!(lead.xUrl || lead.telegramUrl || lead.discordUrl);

  let marketActivity = "Insufficient data";
  if (data) {
    const v = data.volume24hUsd;
    const l = data.liquidityUsd;
    if (v == null && l == null) marketActivity = "Insufficient data";
    else if (v != null && l != null && v >= 100000 && l >= 50000) marketActivity = "Strong market activity";
    else if ((v != null && v >= 10000) || (l != null && l >= 10000)) marketActivity = "Moderate market activity";
    else marketActivity = "Limited market activity";
  }

  let confidence = 0;
  if (data) {
    confidence += 25;
    if (data.volume24hUsd != null) confidence += 10;
    if (data.liquidityUsd != null) confidence += 10;
    if (data.marketCap != null || data.fdv != null) confidence += 10;
    if (data.tokenName || data.tokenSymbol) confidence += 10;
    if (lead.websiteUrl) confidence += 10;
    if (hasSocial) confidence += 10;
    if (hasNotes) confidence += 10;
    if (hasContact) confidence += 5;
  }

  let nextAction = "Fetch live market data";
  if (data) {
    if (!hasNotes) nextAction = "Research the project and its team";
    else if (!hasContact) nextAction = "Find an official founder or BD contact";
    else if (followUpBucket(lead.nextFollowUpAt) === "overdue" || followUpBucket(lead.nextFollowUpAt) === "today") nextAction = "Follow up (due/overdue)";
    else if (data.volume24hUsd == null && data.liquidityUsd == null) nextAction = "Review market activity before deciding";
    else nextAction = "Investigate evidence of listing readiness";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Live Market Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2 items-end">
          <Select value={provider} onValueChange={(v) => setProvider(v as "dex" | "gecko")}>
            <SelectTrigger className="h-8 text-xs font-mono w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="dex">DEX Screener</SelectItem>
              <SelectItem value="gecko">GeckoTerminal</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" disabled={loading || !chain || !contractAddress} onClick={handleFetch}>
            {loading ? "Fetching..." : data ? "Refresh" : "Fetch"}
          </Button>
        </div>
        {!chain || !contractAddress ? (
          <p className="text-xs text-muted-foreground">Chain and contract address are required to fetch live data.</p>
        ) : !data && !error && !loading ? (
          <p className="text-xs text-muted-foreground">No live market data fetched yet. Click Fetch to request a snapshot.</p>
        ) : null}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {data && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Provider: {data.provider} · Fetched {new Date(data.fetchedAt).toLocaleString()}</div>
            {data.pairUrl && <div><a href={data.pairUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">View on provider</a></div>}
            {data.dexName && <div><span className="text-muted-foreground">DEX:</span> {data.dexName}</div>}
            <div><span className="text-muted-foreground">Price:</span> {data.priceUsd ? `$${data.priceUsd}` : "Unavailable"}</div>
            <div><span className="text-muted-foreground">24h change:</span> {data.priceChange24h ?? "Unavailable"}</div>
            <div><span className="text-muted-foreground">24h volume:</span> {fmt(data.volume24hUsd)}</div>
            <div><span className="text-muted-foreground">Liquidity:</span> {fmt(data.liquidityUsd)}</div>
            <div><span className="text-muted-foreground">Market cap:</span> {data.marketCap != null ? `$${data.marketCap.toLocaleString()} (${data.marketCapSource})` : "Unavailable"}</div>
            <div><span className="text-muted-foreground">FDV:</span> {data.fdv != null ? `$${data.fdv.toLocaleString()}` : "Unavailable"}</div>
            <div><span className="text-muted-foreground">Token:</span> {data.tokenName ?? "—"} ({data.tokenSymbol ?? "—"})</div>
            <p className="text-xs text-muted-foreground pt-2">Live provider snapshot; not persisted to the saved lead.</p>
          </div>
        )}
        {data && (
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div>
              <div className="text-xs font-semibold">Live Market Assessment (internal heuristic)</div>
              <div className="text-sm">{marketActivity}</div>
              <p className="text-xs text-muted-foreground">Based on available volume/liquidity bands. Market activity is not legitimacy or listing readiness. Missing metrics are not treated as zero.</p>
            </div>
            <div>
              <div className="text-xs font-semibold">Qualification Confidence: {confidence}%</div>
              <p className="text-xs text-muted-foreground">Confidence reflects completeness of available evidence (snapshot + fields + notes + contact), not project trustworthiness.</p>
            </div>
            <div>
              <div className="text-xs font-semibold">Listing Readiness Evidence</div>
              <p className="text-xs text-muted-foreground">{hasNotes ? "Research notes recorded; review them for listing-readiness evidence (not verified)." : "No listing-readiness evidence recorded yet."}</p>
              {hasNotes && <pre className="text-xs whitespace-pre-wrap mt-1">{lead.notes}</pre>}
            </div>
            <div>
              <div className="text-xs font-semibold">Recommended Next Action</div>
              <p className="text-xs">{nextAction}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
