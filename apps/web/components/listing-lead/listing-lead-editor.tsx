"use client";

const RESEARCH_TEMPLATE = `Project research
- Team/founder findings:
- Official contact and source:
- Evidence of CEX listing readiness:
- Positive signals:
- Concerns/red flags:
- Sources reviewed:
- Next research action:
`;

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { updateListingLead, type ListingLeadInput } from "@/app/listing-leads/actions";
import { STATUS_OPTIONS } from "./listing-lead-table";
import { listingLeadStatusLabel } from "@/lib/listing-lead-status";

interface Lead {
  id: string;
  projectName: string;
  tokenSymbol: string | null;
  chain: string | null;
  contractAddress: string | null;
  websiteUrl: string | null;
  xUrl: string | null;
  telegramUrl: string | null;
  discordUrl: string | null;
  discoverySource: string;
  sourceUrl: string | null;
  volume24hUsd: number | null;
  holderCount: number | null;
  listingStatus: string;
  priority: number;
  contactName: string | null;
  contactEmail: string | null;
  contactTelegram: string | null;
  notes: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
}

export function ListingLeadEditor({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<ListingLeadInput>({
    projectName: lead.projectName,
    tokenSymbol: lead.tokenSymbol ?? "",
    chain: lead.chain ?? "",
    contractAddress: lead.contractAddress ?? "",
    websiteUrl: lead.websiteUrl ?? "",
    xUrl: lead.xUrl ?? "",
    telegramUrl: lead.telegramUrl ?? "",
    discordUrl: lead.discordUrl ?? "",
    discoverySource: lead.discoverySource as ListingLeadInput["discoverySource"],
    sourceUrl: lead.sourceUrl ?? "",
    volume24hUsd: lead.volume24hUsd,
    holderCount: lead.holderCount,
    listingStatus: lead.listingStatus as ListingLeadInput["listingStatus"],
    priority: lead.priority,
    contactName: lead.contactName ?? "",
    contactEmail: lead.contactEmail ?? "",
    contactTelegram: lead.contactTelegram ?? "",
    notes: lead.notes ?? "",
    lastContactedAt: lead.lastContactedAt ? lead.lastContactedAt.slice(0, 10) : "",
    nextFollowUpAt: lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : "",
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateListingLead(lead.id, form);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit research</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit research & outreach</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.listingStatus} onValueChange={(v) => setForm({ ...form, listingStatus: v as ListingLeadInput["listingStatus"] })}>
                <SelectTrigger className="h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{listingLeadStatusLabel(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Contact name</Label>
              <Input value={form.contactName ?? ""} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact email</Label>
              <Input value={form.contactEmail ?? ""} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contact Telegram</Label>
            <Input value={form.contactTelegram ?? ""} onChange={(e) => setForm({ ...form, contactTelegram: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Last contacted</Label>
              <Input type="date" value={form.lastContactedAt ?? ""} onChange={(e) => setForm({ ...form, lastContactedAt: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Next follow-up</Label>
              <Input type="date" value={form.nextFollowUpAt ?? ""} onChange={(e) => setForm({ ...form, nextFollowUpAt: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Research notes</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, notes: f.notes && f.notes.trim() ? f.notes + "\n\n" + RESEARCH_TEMPLATE : RESEARCH_TEMPLATE }))}>
                Insert research template
              </Button>
            </div>
            <Textarea rows={8} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Why promising, concerns, team research, listing-readiness evidence..." />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
          <Button size="sm" disabled={saving} onClick={handleSave}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
