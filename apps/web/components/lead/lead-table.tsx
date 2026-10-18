"use client";

import * as React from "react";
import {
  ExternalLink,
  Github,
  Rss,
  Save,
  Check,
  Search,
  Filter,
  UserCheck,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, type StatusType } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { updateLeadNotes, updateLeadStatus } from "@/app/actions";
import { cn } from "@/lib/utils";

export interface LeadItem {
  id: string;
  handle: string;
  platform: string;
  profileUrl: string | null;
  status:
    | "DISCOVERED"
    | "RESEARCHING"
    | "QUALIFIED"
    | "READY_TO_CONTACT"
    | "CONTACTED"
    | "REPLIED"
    | "IN_PROGRESS"
    | "WON"
    | "LOST"
    | "CONVERTED"
    | "ARCHIVED";
  notes: string | null;
  opportunityTitle: string;
  opportunityUrl: string;
  opportunityId: string;
  opportunityType: string;
  priority: number;
  savedAt: string;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  updatedAt?: string;
}

interface LeadTableProps {
  leads: LeadItem[];
}

const statusOptions: LeadItem["status"][] = [
  "DISCOVERED",
  "RESEARCHING",
  "QUALIFIED",
  "READY_TO_CONTACT",
  "CONTACTED",
  "REPLIED",
  "IN_PROGRESS",
  "WON",
  "LOST",
  "CONVERTED",
  "ARCHIVED",
];

export function ModernLeadTable({ leads }: LeadTableProps) {
  const [filter, setFilter] = React.useState<string>("active");
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    return leads.filter((lead) => {
      // 1. Text filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesHandle = lead.handle.toLowerCase().includes(query);
        const matchesTitle = lead.opportunityTitle
          .toLowerCase()
          .includes(query);
        const matchesNotes = (lead.notes ?? "").toLowerCase().includes(query);
        if (!matchesHandle && !matchesTitle && !matchesNotes) return false;
      }

      // 2. Status tab filter
      if (filter === "active") return lead.status !== "ARCHIVED";
      if (filter !== "all") return lead.status === filter;

      return true;
    });
  }, [leads, filter, search]);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-lg border border-border/80 bg-card/50 p-3 sm:p-4">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search leads by handle or notes..."
          />
        </div>

        <Tabs value={filter} onValueChange={setFilter} className="w-auto">
          <TabsList className="h-8 bg-secondary/60 p-0.5">
            <TabsTrigger value="active" className="text-xs h-7 px-3 font-mono">
              Active
            </TabsTrigger>
            <TabsTrigger
              value="QUALIFIED"
              className="text-xs h-7 px-3 font-mono"
            >
              Qualified
            </TabsTrigger>
            <TabsTrigger
              value="CONTACTED"
              className="text-xs h-7 px-3 font-mono"
            >
              Contacted
            </TabsTrigger>
            <TabsTrigger
              value="CONVERTED"
              className="text-xs h-7 px-3 font-mono"
            >
              Converted
            </TabsTrigger>
            <TabsTrigger
              value="ARCHIVED"
              className="text-xs h-7 px-3 font-mono"
            >
              Archived
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs h-7 px-3 font-mono">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table Container */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No leads in this view"
          description={
            search || filter !== "active"
              ? "No leads match your current search or status filter."
              : "No tracked leads found. Save opportunities from the Discover feed to populate your pipeline."
          }
        />
      ) : (
        <div className="rounded-md border border-border/80 bg-card/60 overflow-hidden">
          <Table>
            <TableHeader className="bg-secondary/40 font-mono text-[10px] uppercase">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[180px]">Contact</TableHead>
                <TableHead className="min-w-[220px]">Opportunity</TableHead>
                <TableHead className="w-[150px]">Status</TableHead>
                <TableHead className="min-w-[200px]">Outreach Notes</TableHead>
                <TableHead className="w-[60px] text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => (
                <LeadRowItem key={lead.id} lead={lead} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function LeadRowItem({ lead }: { lead: LeadItem }) {
  const [isPending, startTransition] = React.useTransition();
  const [notes, setNotes] = React.useState(lead.notes ?? "");
  const [savedNotes, setSavedNotes] = React.useState(lead.notes ?? "");
  const [isSavedRecently, setIsSavedRecently] = React.useState(false);

  const handleStatusChange = (newStatus: LeadItem["status"]) => {
    startTransition(async () => {
      await updateLeadStatus(lead.id, newStatus);
    });
  };

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await updateLeadNotes(lead.id, notes);
      setSavedNotes(notes);
      setIsSavedRecently(true);
      setTimeout(() => setIsSavedRecently(false), 2000);
    });
  };

  const hasUnsavedNotes = notes !== savedNotes;

  return (
    <TableRow className="border-border/60 hover:bg-secondary/30 transition-colors">
      {/* Contact */}
      <TableCell className="font-medium">
        <div className="flex items-center gap-2.5">
          <div className="grid size-7 place-items-center rounded-full bg-secondary border border-border shrink-0">
            {lead.platform === "RSS" ? (
              <Rss className="size-3 text-amber-400" />
            ) : (
              <Github className="size-3 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <span className="block truncate font-mono text-xs text-foreground font-semibold">
              @{lead.handle}
            </span>
            <span className="block font-mono text-[10px] text-muted-foreground">
              {lead.platform}
            </span>
          </div>
        </div>
      </TableCell>

      {/* Source Opportunity */}
      <TableCell>
        <a
          href={lead.opportunityUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-foreground hover:text-primary transition-colors line-clamp-1 inline-flex items-center gap-1.5"
        >
          <span>{lead.opportunityTitle}</span>
          <ExternalLink className="size-3 text-muted-foreground shrink-0" />
        </a>
      </TableCell>

      {/* Pipeline Status */}
      <TableCell>
        <Select
          disabled={isPending}
          value={lead.status}
          onValueChange={(val) => handleStatusChange(val as LeadItem["status"])}
        >
          <SelectTrigger className="h-7 text-xs font-mono bg-secondary/50 border-border/80 w-[130px]">
            <SelectValue>
              <StatusBadge status={lead.status} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {statusOptions.map((status) => (
              <SelectItem
                key={status}
                value={status}
                className="text-xs font-mono"
              >
                <StatusBadge status={status} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Notes Form */}
      <TableCell>
        <form
          onSubmit={handleSaveNotes}
          className="flex items-center gap-1.5 max-w-sm"
        >
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add outreach context or contacts..."
            className="h-7 text-xs bg-secondary/30 border-border/60 focus-visible:ring-primary/40"
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon-xs"
            disabled={!hasUnsavedNotes || isPending}
            className={cn(
              "size-7 shrink-0",
              hasUnsavedNotes
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground opacity-50",
            )}
            title="Save notes"
          >
            {isSavedRecently ? (
              <Check className="size-3 text-emerald-400" />
            ) : (
              <Save className="size-3" />
            )}
          </Button>
        </form>
      </TableCell>

      {/* External Action */}
      <TableCell className="text-right">
        {lead.profileUrl ? (
          <a
            href={lead.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-grid size-7 place-items-center rounded border border-border/60 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            title="View contact profile"
          >
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-muted-foreground text-xs font-mono">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
