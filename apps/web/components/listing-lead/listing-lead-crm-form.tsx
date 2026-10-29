"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateListingLeadCrmFields } from "@/app/listing-leads/actions";

export function ListingLeadCrmForm({ lead }: { lead: any }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState({
    notes: lead.notes ?? "",
    whyInteresting: lead.whyInteresting ?? "",
    nextAction: lead.nextAction ?? "",
    outcome: lead.outcome ?? "",
    contactName: lead.contactName ?? "",
    contactEmail: lead.contactEmail ?? "",
    contactTelegram: lead.contactTelegram ?? "",
    priority: lead.priority ?? 0,
    listingStatus: lead.listingStatus ?? "DISCOVERED",
    nextFollowUpAt: lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : "",
    lastContactedAt: lead.lastContactedAt ? lead.lastContactedAt.slice(0, 10) : "",
  });

  async function save() {
    setPending(true);
    try {
      await updateListingLeadCrmFields(lead.id, {
        notes: form.notes || null,
        whyInteresting: form.whyInteresting || null,
        nextAction: form.nextAction || null,
        outcome: form.outcome || null,
        contactName: form.contactName || null,
        contactEmail: form.contactEmail || null,
        contactTelegram: form.contactTelegram || null,
        priority: Number(form.priority) || 0,
        listingStatus: form.listingStatus as any,
        nextFollowUpAt: form.nextFollowUpAt || null,
        lastContactedAt: form.lastContactedAt || null,
      });
      router.refresh();
    } catch (e) {
      // keep silent to avoid exposing auth details; let server action handle redirects
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">CRM & Research</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1"><span className="text-muted-foreground">Status</span>
            <select className="w-full rounded border border-border bg-background px-2 py-1" value={form.listingStatus} onChange={(e) => setForm({ ...form, listingStatus: e.target.value })}>
              {["DISCOVERED","RESEARCHING","QUALIFIED","CONTACTED","REPLIED","IN_PROGRESS","WON","LOST","CONVERTED","ARCHIVED"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="space-y-1"><span className="text-muted-foreground">Priority</span>
            <input type="number" className="w-full rounded border border-border bg-background px-2 py-1" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
          </label>
          <label className="space-y-1"><span className="text-muted-foreground">Last contacted</span>
            <input type="date" className="w-full rounded border border-border bg-background px-2 py-1" value={form.lastContactedAt} onChange={(e) => setForm({ ...form, lastContactedAt: e.target.value })} />
          </label>
          <label className="space-y-1"><span className="text-muted-foreground">Next follow-up</span>
            <input type="date" className="w-full rounded border border-border bg-background px-2 py-1" value={form.nextFollowUpAt} onChange={(e) => setForm({ ...form, nextFollowUpAt: e.target.value })} />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="space-y-1"><span className="text-muted-foreground">Contact name</span>
            <input className="w-full rounded border border-border bg-background px-2 py-1" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </label>
          <label className="space-y-1"><span className="text-muted-foreground">Contact email</span>
            <input className="w-full rounded border border-border bg-background px-2 py-1" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </label>
          <label className="space-y-1"><span className="text-muted-foreground">Contact Telegram</span>
            <input className="w-full rounded border border-border bg-background px-2 py-1" value={form.contactTelegram} onChange={(e) => setForm({ ...form, contactTelegram: e.target.value })} />
          </label>
        </div>
        <label className="space-y-1 block"><span className="text-muted-foreground">Why interesting</span>
          <textarea className="w-full min-h-[80px] rounded border border-border bg-background px-2 py-1" value={form.whyInteresting} onChange={(e) => setForm({ ...form, whyInteresting: e.target.value })} />
        </label>
        <label className="space-y-1 block"><span className="text-muted-foreground">Next action</span>
          <textarea className="w-full min-h-[60px] rounded border border-border bg-background px-2 py-1" value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} />
        </label>
        <label className="space-y-1 block"><span className="text-muted-foreground">Outcome</span>
          <textarea className="w-full min-h-[60px] rounded border border-border bg-background px-2 py-1" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
        </label>
        <label className="space-y-1 block"><span className="text-muted-foreground">Research notes</span>
          <textarea className="w-full min-h-[80px] rounded border border-border bg-background px-2 py-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        <Button size="sm" onClick={save} disabled={pending}>{pending ? "Saving..." : "Save CRM fields"}</Button>
      </CardContent>
    </Card>
  );
}
