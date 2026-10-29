"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildOutreachDraft } from "@/lib/lead-crm";

export function OutreachDraftEditor({ lead }: { lead: any }) {
  const initial = buildOutreachDraft({
    projectName: lead.projectName,
    tokenSymbol: lead.tokenSymbol,
    chain: lead.chain,
    websiteUrl: lead.websiteUrl,
    whyInteresting: lead.whyInteresting,
  });
  const [draft, setDraft] = React.useState(initial);
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function regenerate() {
    setDraft(
      buildOutreachDraft({
        projectName: lead.projectName,
        tokenSymbol: lead.tokenSymbol,
        chain: lead.chain,
        websiteUrl: lead.websiteUrl,
        whyInteresting: lead.whyInteresting,
      })
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Outreach draft (editable)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <textarea
          className="w-full min-h-[160px] rounded-md border border-border bg-background p-2 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={regenerate}>Regenerate from evidence</Button>
          <Button size="sm" onClick={copy}>{copied ? "Copied" : "Copy draft"}</Button>
        </div>
        <p className="text-xs text-muted-foreground">Draft uses only available lead data. Review and edit before sending.</p>
      </CardContent>
    </Card>
  );
}
