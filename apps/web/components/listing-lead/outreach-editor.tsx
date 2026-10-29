"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateListingLeadPitches, saveListingLeadPitches } from "@/app/listing-leads/actions";
import { useRouter } from "next/navigation";

export function OutreachEditor({ lead }: { lead: any }) {
  const router = useRouter();
  const [normal, setNormal] = React.useState(lead.outreachNormal || "");
  const [cold, setCold] = React.useState(lead.outreachCold || "");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    setNormal(lead.outreachNormal || "");
    setCold(lead.outreachCold || "");
  }, [lead.outreachNormal, lead.outreachCold]);

  async function generate(force = false) {
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await generateListingLeadPitches(lead.id, force);
      setNormal(res.normal || "");
      setCold(res.cold || "");
      if (res.error) setErr(res.error);
      else setMsg(res.usedAi ? "Generated with AI" : "Generated");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      await saveListingLeadPitches(lead.id, normal, cold);
      setMsg("Saved");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copied");
      setTimeout(() => setMsg(null), 1000);
    } catch {
      setErr("Copy failed");
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">AI Outreach Pitches</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => generate(false)} disabled={loading}>{loading ? "Generating..." : "Generate pitches"}</Button>
          <Button size="sm" variant="outline" onClick={() => generate(true)} disabled={loading}>Regenerate both</Button>
          <Button size="sm" variant="outline" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save edits"}</Button>
        </div>
        {msg && <p className="text-xs text-green-600">{msg}</p>}
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">Normal Pitch</p>
            <Button size="sm" variant="ghost" onClick={() => copy(normal)}>Copy</Button>
          </div>
          <textarea className="w-full min-h-[140px] rounded-md border border-border bg-background p-2 text-sm" value={normal} onChange={(e) => setNormal(e.target.value)} placeholder="Generate pitches to populate..." />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">Cold Pitch</p>
            <Button size="sm" variant="ghost" onClick={() => copy(cold)}>Copy</Button>
          </div>
          <textarea className="w-full min-h-[140px] rounded-md border border-border bg-background p-2 text-sm" value={cold} onChange={(e) => setCold(e.target.value)} placeholder="Generate pitches to populate..." />
        </div>
        <p className="text-xs text-muted-foreground">Pitches are saved to the database. AI uses only supplied evidence; if no AI key is configured, safe fallback templates are used.</p>
      </CardContent>
    </Card>
  );
}
