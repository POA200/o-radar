"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { enrichListingLeadWithCoinGecko } from "@/app/listing-leads/actions";

export function EnrichMetadataButton({ leadId }: { leadId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const handle = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await enrichListingLeadWithCoinGecko(leadId);
      if (res.error) setMsg(res.error);
      else {
        const added = res.added.length ? `Added: ${res.added.join(", ")}` : "No new fields added.";
        const already = res.already.length ? ` Already populated: ${res.already.join(", ")}.` : "";
        setMsg(added + already);
        window.location.reload();
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Enrichment failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-1">
      <Button size="sm" variant="outline" disabled={loading} onClick={handle}>
        {loading ? "Enriching..." : "Enrich metadata"}
      </Button>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}
