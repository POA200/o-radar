"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/search-input";
import {
  createListingLead,
  updateListingLead,
  deleteListingLead,
  type ListingLeadInput,
} from "@/app/listing-leads/actions";
import {
  discoverDexScreener,
  discoverGeckoTerminal,
  type DexScreenerResult,
} from "@/app/listing-leads/actions";
import { scoreProspect } from "@/lib/prospect-score";
import { LISTING_LEAD_STATUS_LABELS, listingLeadStatusLabel, followUpBucket } from "@/lib/listing-lead-status";

export interface ListingLeadItem {
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
  createdAt: string;
  updatedAt: string;
}

interface Props {
  leads: ListingLeadItem[];
}

function formatUsd(value: number | null) {
  if (value === null || value === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

const STATUS_OPTIONS = [
  "DISCOVERED",
  "RESEARCHING",
  "QUALIFIED",
  "CONTACTED",
  "REPLIED",
  "IN_PROGRESS",
  "WON",
  "LOST",
  "CONVERTED",
  "ARCHIVED",
] as const;

const SOURCE_OPTIONS = [
  "DEX_SCREENER",
  "GECKO_TERMINAL",
  "COIN_GECKO",
  "COIN_MARKET_CAP",
  "LAUNCHPAD",
  "MANUAL",
  "OTHER",
] as const;

export function ListingLeadTable({ leads }: Props) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [chainFilter, setChainFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [priorityFilter, setPriorityFilter] = React.useState("all");
  const [followUpFilter, setFollowUpFilter] = React.useState("all");
  const [sortByFollowUp, setSortByFollowUp] = React.useState(false);
  const [editing, setEditing] = React.useState<ListingLeadItem | null>(null);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [discoverOpen, setDiscoverOpen] = React.useState(false);
  const [discoverSource, setDiscoverSource] = React.useState<"profiles" | "search">("profiles");
  const [discoverProvider, setDiscoverProvider] = React.useState<"dex" | "gecko">("dex");
  const [discoverQuery, setDiscoverQuery] = React.useState("");
  const [discoverChain, setDiscoverChain] = React.useState("all");
  const [discoverMinVol, setDiscoverMinVol] = React.useState("");
  const [discoverMinLiq, setDiscoverMinLiq] = React.useState("");
  const [discoverResults, setDiscoverResults] = React.useState<DexScreenerResult[]>([]);
  const [discoverLoading, setDiscoverLoading] = React.useState(false);
  const [discoverError, setDiscoverError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [importing, setImporting] = React.useState(false);

  const handleDiscover = async () => {
    setDiscoverError(null);
    setDiscoverLoading(true);
    setSelected(new Set());
    try {
      const res =
        discoverProvider === "gecko"
          ? await discoverGeckoTerminal({
              source: discoverSource === "search" ? "search" : "new_pools",
              query: discoverQuery,
              network: discoverChain,
              minVolume: discoverMinVol ? Number(discoverMinVol) : undefined,
              minLiquidity: discoverMinLiq ? Number(discoverMinLiq) : undefined,
            })
          : await discoverDexScreener({
              source: discoverSource,
              query: discoverQuery,
              chain: discoverChain,
              minVolume: discoverMinVol ? Number(discoverMinVol) : undefined,
              minLiquidity: discoverMinLiq ? Number(discoverMinLiq) : undefined,
            });
      setDiscoverResults(res);
    } catch (e) {
      setDiscoverError(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      setDiscoverLoading(false);
    }
  };

  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleImport = async () => {
    setImporting(true);
    setDiscoverError(null);
    try {
      for (const i of selected) {
        const r = discoverResults[i];
        if (!r || r.alreadySaved) continue;
        await createListingLead({
          projectName: r.projectName,
          tokenSymbol: r.tokenSymbol ?? "",
          chain: r.chain ?? "",
          contractAddress: r.tokenAddress ?? "",
          websiteUrl: r.websiteUrl ?? "",
          xUrl: r.xUrl ?? "",
          telegramUrl: r.telegramUrl ?? "",
          discordUrl: r.discordUrl ?? "",
          discoverySource: discoverProvider === "gecko" ? "GECKO_TERMINAL" : "DEX_SCREENER",
          sourceUrl: r.sourceUrl ?? "",
          volume24hUsd: r.volume24hUsd,
          holderCount: null,
          listingStatus: "DISCOVERED",
          priority: 0,
          contactName: "",
          contactEmail: "",
          contactTelegram: "",
          notes: r.description ?? "",
          lastContactedAt: "",
          nextFollowUpAt: "",
        });
      }
      setDiscoverOpen(false);
      setDiscoverResults([]);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setDiscoverError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const chains = React.useMemo(
    () => [...new Set(leads.map((l) => l.chain).filter(Boolean) as string[])].sort(),
    [leads],
  );

  const filtered = React.useMemo(() => {
    return leads.filter((l) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !l.projectName.toLowerCase().includes(q) &&
          !(l.tokenSymbol ?? "").toLowerCase().includes(q) &&
          !(l.chain ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      if (chainFilter !== "all" && l.chain !== chainFilter) return false;
      if (statusFilter !== "all" && l.listingStatus !== statusFilter) return false;
      if (priorityFilter !== "all" && String(l.priority) !== priorityFilter) return false;
      if (followUpFilter !== "all" && followUpBucket(l.nextFollowUpAt) !== followUpFilter) return false;
      return true;
    }).sort((a, b) => {
      if (!sortByFollowUp) return 0;
      const aD = a.nextFollowUpAt ? new Date(a.nextFollowUpAt).getTime() : Infinity;
      const bD = b.nextFollowUpAt ? new Date(b.nextFollowUpAt).getTime() : Infinity;
      return aD - bD;
    });
  }, [leads, search, chainFilter, statusFilter, priorityFilter, followUpFilter, sortByFollowUp]);

  const emptyForm: ListingLeadInput = {
    projectName: "",
    tokenSymbol: "",
    chain: "",
    contractAddress: "",
    websiteUrl: "",
    xUrl: "",
    telegramUrl: "",
    discordUrl: "",
    discoverySource: "MANUAL",
    sourceUrl: "",
    volume24hUsd: null,
    holderCount: null,
    listingStatus: "DISCOVERED",
    priority: 0,
    contactName: "",
    contactEmail: "",
    contactTelegram: "",
    notes: "",
    lastContactedAt: "",
    nextFollowUpAt: "",
  };

  const [form, setForm] = React.useState<ListingLeadInput>(emptyForm);

  React.useEffect(() => {
    if (editing) {
      setForm({
        projectName: editing.projectName,
        tokenSymbol: editing.tokenSymbol ?? "",
        chain: editing.chain ?? "",
        contractAddress: editing.contractAddress ?? "",
        websiteUrl: editing.websiteUrl ?? "",
        xUrl: editing.xUrl ?? "",
        telegramUrl: editing.telegramUrl ?? "",
        discordUrl: editing.discordUrl ?? "",
        discoverySource: editing.discoverySource as ListingLeadInput["discoverySource"],
        sourceUrl: editing.sourceUrl ?? "",
        volume24hUsd: editing.volume24hUsd,
        holderCount: editing.holderCount,
        listingStatus: editing.listingStatus as ListingLeadInput["listingStatus"],
        priority: editing.priority,
        contactName: editing.contactName ?? "",
        contactEmail: editing.contactEmail ?? "",
        contactTelegram: editing.contactTelegram ?? "",
        notes: editing.notes ?? "",
        lastContactedAt: editing.lastContactedAt ? editing.lastContactedAt.slice(0, 10) : "",
        nextFollowUpAt: editing.nextFollowUpAt ? editing.nextFollowUpAt.slice(0, 10) : "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      if (editing) await updateListingLead(editing.id, form);
      else await createListingLead(form);
      setOpen(false);
      setEditing(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing lead?")) return;
    try {
      await deleteListingLead(id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-card/50 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <SearchInput value={search} onValueChange={setSearch} placeholder="Search project, token, chain..." shortcutHint="⌘K" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={chainFilter} onValueChange={setChainFilter}>
              <SelectTrigger className="h-8 text-xs font-mono w-[120px] bg-secondary/50 border-border">
                <SelectValue placeholder="Chain" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Chains</SelectItem>
                {chains.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs font-mono w-[130px] bg-secondary/50 border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={followUpFilter} onValueChange={setFollowUpFilter}>
              <SelectTrigger className="h-8 text-xs font-mono w-[130px] bg-secondary/50 border-border">
                <SelectValue placeholder="Follow-up" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Follow-ups</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due Today</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="none">No Follow-up</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={sortByFollowUp} onChange={(e) => setSortByFollowUp(e.target.checked)} />
              Sort by follow-up
            </label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 text-xs font-mono w-[110px] bg-secondary/50 border-border">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Priority</SelectItem>
                {[0, 1, 2, 3, 4, 5].map((p) => (
                  <SelectItem key={p} value={String(p)}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="gap-1.5 h-8 font-mono text-xs font-semibold" onClick={() => { setEditing(null); setForm(emptyForm); }}>
                  <Plus className="size-3.5" /> New Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Listing Lead" : "New Listing Lead"}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Project Name *</Label>
                    <Input value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Token Symbol</Label>
                    <Input value={form.tokenSymbol ?? ""} onChange={(e) => setForm({ ...form, tokenSymbol: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Chain</Label>
                    <Input value={form.chain ?? ""} onChange={(e) => setForm({ ...form, chain: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contract Address</Label>
                    <Input value={form.contractAddress ?? ""} onChange={(e) => setForm({ ...form, contractAddress: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Website URL</Label>
                    <Input value={form.websiteUrl ?? ""} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">X (Twitter) URL</Label>
                    <Input value={form.xUrl ?? ""} onChange={(e) => setForm({ ...form, xUrl: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Telegram URL</Label>
                    <Input value={form.telegramUrl ?? ""} onChange={(e) => setForm({ ...form, telegramUrl: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Discord URL</Label>
                    <Input value={form.discordUrl ?? ""} onChange={(e) => setForm({ ...form, discordUrl: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Discovery Source</Label>
                    <Select value={form.discoverySource} onValueChange={(v) => setForm({ ...form, discoverySource: v as ListingLeadInput["discoverySource"] })}>
                      <SelectTrigger className="h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Source URL</Label>
                    <Input value={form.sourceUrl ?? ""} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">24h Volume (USD)</Label>
                    <Input type="number" value={form.volume24hUsd ?? ""} onChange={(e) => setForm({ ...form, volume24hUsd: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Holder Count</Label>
                    <Input type="number" value={form.holderCount ?? ""} onChange={(e) => setForm({ ...form, holderCount: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select value={form.listingStatus} onValueChange={(v) => setForm({ ...form, listingStatus: v as ListingLeadInput["listingStatus"] })}>
                      <SelectTrigger className="h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{listingLeadStatusLabel(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Priority</Label>
                    <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contact Name</Label>
                    <Input value={form.contactName ?? ""} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contact Email</Label>
                    <Input value={form.contactEmail ?? ""} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contact Telegram</Label>
                    <Input value={form.contactTelegram ?? ""} onChange={(e) => setForm({ ...form, contactTelegram: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Last Contacted</Label>
                    <Input type="date" value={form.lastContactedAt ?? ""} onChange={(e) => setForm({ ...form, lastContactedAt: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Next Follow-up</Label>
                    <Input type="date" value={form.nextFollowUpAt ?? ""} onChange={(e) => setForm({ ...form, nextFollowUpAt: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Notes</Label>
                    <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                  </div>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" size="sm">Cancel</Button>
                  </DialogClose>
                  <Button size="sm" disabled={saving} onClick={handleSave}>
                    {saving ? "Saving..." : editing ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={discoverOpen} onOpenChange={setDiscoverOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 font-mono text-xs font-semibold">
                  Discover Projects
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Discover Projects via DEX Screener</DialogTitle>
                </DialogHeader>
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Provider</Label>
                    <Select value={discoverProvider} onValueChange={(v) => setDiscoverProvider(v as "dex" | "gecko")}>
                      <SelectTrigger className="h-8 text-xs font-mono w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="dex">DEX Screener</SelectItem>
                        <SelectItem value="gecko">GeckoTerminal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Source</Label>
                    <Select value={discoverSource} onValueChange={(v) => setDiscoverSource(v as "profiles" | "search")}>
                      <SelectTrigger className="h-8 text-xs font-mono w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="profiles">Token Profiles</SelectItem>
                        <SelectItem value="search">Search</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {discoverSource === "search" && (
                    <div className="space-y-1 flex-1 min-w-[160px]">
                      <Label className="text-xs">Query</Label>
                      <Input value={discoverQuery} onChange={(e) => setDiscoverQuery(e.target.value)} placeholder="token name/symbol" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Chain</Label>
                    <Input value={discoverChain} onChange={(e) => setDiscoverChain(e.target.value)} placeholder="all" className="w-[100px]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Min 24h Vol</Label>
                    <Input type="number" value={discoverMinVol} onChange={(e) => setDiscoverMinVol(e.target.value)} className="w-[110px]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Min Liquidity</Label>
                    <Input type="number" value={discoverMinLiq} onChange={(e) => setDiscoverMinLiq(e.target.value)} className="w-[110px]" />
                  </div>
                  <Button size="sm" disabled={discoverLoading} onClick={handleDiscover}>
                    {discoverLoading ? "Loading..." : "Fetch"}
                  </Button>
                </div>
                {discoverError && <p className="text-xs text-destructive">{discoverError}</p>}
                {discoverResults.length > 0 && (
                  <>
                    <div className="rounded-lg border border-border/80 overflow-x-auto max-h-[40vh]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Chain</TableHead>
                            <TableHead>24h Vol</TableHead>
                            <TableHead>Liquidity</TableHead>
                            <TableHead>Market Cap</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Source</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {discoverResults.map((r, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <input type="checkbox" checked={selected.has(i)} onChange={() => toggleSelect(i)} disabled={!!r.alreadySaved} />
                                {r.alreadySaved && <span className="ml-1 text-[10px] text-muted-foreground">Already saved</span>}
                              </TableCell>
                              <TableCell className="font-medium">{r.projectName}</TableCell>
                              <TableCell className="font-mono text-xs">{r.tokenSymbol ?? "—"}</TableCell>
                              <TableCell>{r.chain ?? "—"}</TableCell>
                              <TableCell className="font-mono text-xs">{formatUsd(r.volume24hUsd)}</TableCell>
                              <TableCell className="font-mono text-xs">{formatUsd(r.liquidityUsd)}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {r.marketCap === null ? "N/A" : `${r.marketCapSource === "fdv" ? "FDV" : "MC"} ${formatUsd(r.marketCap)}`}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {(() => {
                                  const sc = scoreProspect(r);
                                  const title = `${sc.label} — ${sc.score}/100\n${sc.positives.join(", ")}${sc.warnings.length ? "\nWarnings: " + sc.warnings.join(", ") : ""}`;
                                  return <span title={title} className={sc.label === "Insufficient data" ? "text-muted-foreground" : ""}>{sc.score} · {sc.label}</span>;
                                })()}
                              </TableCell>
                              <TableCell>
                                {r.sourceUrl && (
                                  <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                                    <ExternalLink className="size-3" />
                                  </a>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <DialogFooter>
                      <Button size="sm" disabled={importing || selected.size === 0} onClick={handleImport}>
                        {importing ? "Importing..." : `Import ${selected.size} selected`}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No listing leads found"
          description={search || chainFilter !== "all" || statusFilter !== "all" ? "No leads match the current filters." : "No listing leads yet. Create one to get started."}
        />
      ) : (
        <div className="rounded-lg border border-border/80 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Chain</TableHead>
                <TableHead>24h Vol</TableHead>
                <TableHead>Holders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {l.projectName}
                      {l.xUrl && (
                        <a href={l.xUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.tokenSymbol ?? "—"}</TableCell>
                  <TableCell>{l.chain ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{formatUsd(l.volume24hUsd)}</TableCell>
                  <TableCell className="font-mono text-xs">{l.holderCount ?? "N/A"}</TableCell>
                  <TableCell>
                    <StatusBadge status={l.listingStatus} label={listingLeadStatusLabel(l.listingStatus)} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.priority}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {l.nextFollowUpAt ? (
                      <span className={followUpBucket(l.nextFollowUpAt) === "overdue" ? "text-destructive font-semibold" : followUpBucket(l.nextFollowUpAt) === "today" ? "text-amber-500 font-semibold" : ""}>
                        {new Date(l.nextFollowUpAt).toLocaleDateString()}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => { setEditing(l); setOpen(true); }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(l.id)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
