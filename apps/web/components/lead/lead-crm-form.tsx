"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateLeadCrmFields } from "@/app/actions";
import { useRouter } from "next/navigation";

export function LeadCrmForm({ lead }: { lead: any }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState({
    whyInteresting: lead.whyInteresting ?? "",
    notes: lead.notes ?? "",
    nextAction: lead.nextAction ?? "",
    outcome: lead.outcome ?? "",
    priority: lead.priority ?? 0,
    lastContactedAt: lead.lastContactedAt ? lead.lastContactedAt.slice(0, 10) : "",
    nextFollowUpAt: lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : "",
  });

  React.useEffect(() => {
    setForm({
      whyInteresting: lead.whyInteresting ?? "",
      notes: lead.notes ?? "",
      nextAction: lead.nextAction ?? "",
      outcome: lead.outcome ?? "",
      priority: lead.priority ?? 0,
      lastContactedAt: lead.lastContactedAt ? lead.lastContactedAt.slice(0, 10) : "",
      nextFollowUpAt: lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : "",
    });
  }, [lead.whyInteresting, lead.notes, lead.nextAction, lead.outcome, lead.priority, lead.lastContactedAt, lead.nextFollowUpAt]);

  async function save() {
    setPending(true);
    try {
      await updateLeadCrmFields(lead.id, {
        whyInteresting: form.whyInteresting || null,
        notes: form.notes || null,
        nextAction: form.nextAction || null,
        outcome: form.outcome || null,
        priority: Number(form.priority) || 0,
        nextFollowUpAt: form.nextFollowUpAt || null,
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">CRM & Research</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1"><span className="text-muted-foreground">Priority</span>
            <input type="number" className="w-full rounded border border-border bg-background px-2 py-1" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
          </label>
          <label className="space-y-1"><span className="text-muted-foreground">Last contacted</span>
            <input type="date" className="w-full rounded border border-border bg-background px-2 py-1" value={form.lastContactedAt} readOnly />
          </label>
          <label className="space-y-1"><span className="text-muted-foreground">Next follow-up</span>
            <input type="date" className="w-full rounded border border-border bg-background px-2 py-1" value={form.nextFollowUpAt} onChange={(e) => setForm({ ...form, nextFollowUpAt: e.target.value })} />
          </label>
        </div>
        <label className="space-y-1 block"><span className="text-muted-foreground">Why the opportunity interests me</span>
          <textarea className="w-full min-h-[80px] rounded border border-border bg-background px-2 py-1" value={form.whyInteresting} onChange={(e) => setForm({ ...form, whyInteresting: e.target.value })} />
        </label>
        <label className="space-y-1 block"><span className="text-muted-foreground">Research notes</span>
          <textarea className="w-full min-h-[80px] rounded border border-border bg-background px-2 py-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        <label className="space-y-1 block"><span className="text-muted-foreground">Next action</span>
          <textarea className="w-full min-h-[60px] rounded border border-border bg-background px-2 py-1" value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} />
        </label>
        <label className="space-y-1 block"><span className="text-muted-foreground">Outcome</span>
          <textarea className="w-full min-h-[60px] rounded border border-border bg-background px-2 py-1" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
        </label>
        <Button size="sm" onClick={save} disabled={pending}>{pending ? "Saving..." : "Save CRM fields"}</Button>
        <p className="text-xs text-muted-foreground">Contact date is auto-recorded when status becomes CONTACTED (preserved on unrelated edits).</p>
      </CardContent>
    </Card>
  );
}
