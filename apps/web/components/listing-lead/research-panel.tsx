"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { runListingLeadResearch } from "@/app/listing-leads/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ResearchReport = {
  id: string;
  mode: string;
  status: string;
  summary: string | null;
  findings: any;
  sources: any;
  confidence: number | null;
  createdAt: string;
};

export function ResearchPanel({ leadId, reports }: { leadId: string; reports: ResearchReport[] }) {
  const router = useRouter();
  const [running, setRunning] = React.useState<"QUICK" | "DEEP" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(reports[0]?.id ?? null);

  const sorted = [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const selected = sorted.find((r) => r.id === selectedId) ?? sorted[0] ?? null;

  async function run(mode: "QUICK" | "DEEP") {
    setRunning(mode);
    setError(null);
    try {
      await runListingLeadResearch(leadId, mode);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Research failed");
    } finally {
      setRunning(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Automated Research</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button size="sm" disabled={!!running} onClick={() => run("QUICK")}>
            {running === "QUICK" ? "Running Quick..." : "Quick Research"}
          </Button>
          <Button size="sm" variant="outline" disabled={!!running} onClick={() => run("DEEP")}>
            {running === "DEEP" ? "Running Deep..." : "Deep Research"}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {sorted.length === 0 && !running && <p className="text-xs text-muted-foreground">No research yet.</p>}
        {selected && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline">{selected.mode}</Badge>
              <Badge variant="outline">{selected.status}</Badge>
              {selected.confidence != null && <span>Confidence: {selected.confidence}</span>}
              <span className="text-muted-foreground">{new Date(selected.createdAt).toLocaleString()}</span>
            </div>
            {selected.summary && <p className="text-sm whitespace-pre-wrap">{selected.summary}</p>}
            {selected.findings && (
              <div className="text-xs">
                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(selected.findings, null, 2)}</pre>
              </div>
            )}
            {Array.isArray(selected.sources) && selected.sources.length > 0 && (
              <div className="text-xs space-y-1">
                <p className="font-medium">Sources</p>
                {selected.sources.map((s: any, i: number) => (
                  <div key={i}>
                    {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">{s.url}</a> : "—"}
                    {s.retrievedAt && <span className="text-muted-foreground ml-2">{s.retrievedAt}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {sorted.length > 1 && (
          <div className="space-y-1">
            <p className="text-xs font-medium">History</p>
            {sorted.map((r) => (
              <button key={r.id} onClick={() => setSelectedId(r.id)} className={`block w-full text-left text-xs px-2 py-1 rounded ${selected?.id === r.id ? "bg-secondary" : "hover:bg-secondary/50"}`}>
                {r.mode} · {r.status} · {new Date(r.createdAt).toLocaleString()}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
