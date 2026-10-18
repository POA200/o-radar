"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Radar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { OpportunityCard, type OpportunityItem } from "./opportunity-card";
import { OpportunityDetailSheet } from "./opportunity-detail-sheet";
import { runDiscovery, type HuntSource } from "@/app/actions";
import {
  classifyOpportunity,
  type OpportunityType,
} from "@/src/lib/opportunity-classifier";

interface OpportunityFeedViewProps {
  opportunities: OpportunityItem[];
  initialFilters?: { search?: string; type?: string; confidence?: string };
  title?: string;
  description?: string;
  showHuntControl?: boolean;
}

export function OpportunityFeedView({
  opportunities,
  initialFilters,
  title,
  description,
  showHuntControl = true,
}: OpportunityFeedViewProps) {
  const router = useRouter();
  const [selectedOpportunity, setSelectedOpportunity] =
    React.useState<OpportunityItem | null>(null);
  const [search, setSearch] = React.useState(initialFilters?.search ?? "");
  const [sourceFilter, setSourceFilter] = React.useState<HuntSource>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>(
    initialFilters?.type ?? "all",
  );
  const [confidenceFilter, setConfidenceFilter] = React.useState<string>(
    initialFilters?.confidence ?? "all",
  );
  const [huntMessage, setHuntMessage] = React.useState("");
  const [isHunting, startHunt] = React.useTransition();

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleHunt = () => {
    setHuntMessage("");
    startHunt(async () => {
      try {
        const result = await runDiscovery(sourceFilter);
        const discovered =
          (result.github?.discovered ?? 0) + (result.rss?.discovered ?? 0);
        const skipped =
          (result.github?.skipped ?? 0) + (result.rss?.skipped ?? 0);
        setHuntMessage(`Synced: ${discovered} new, ${skipped} already tracked`);
        router.refresh();
      } catch (err) {
        setHuntMessage(err instanceof Error ? err.message : "Hunt failed");
      }
    });
  };

  // Filter pipeline
  const filtered = React.useMemo(() => {
    return opportunities.filter((item) => {
      // 1. Text Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesContent = item.content.toLowerCase().includes(query);
        const matchesOrg = item.url.toLowerCase().includes(query);
        if (!matchesTitle && !matchesContent && !matchesOrg) return false;
      }

      // 2. Source Filter
      if (sourceFilter === "github" && item.source !== "GITHUB_ISSUE")
        return false;
      if (sourceFilter === "rss" && item.source !== "RSS_FEED") return false;

      // 3. Classified Filters (Type & Confidence)
      if (typeFilter !== "all" || confidenceFilter !== "all") {
        const classified = classifyOpportunity(
          item.title,
          item.content,
          item.url,
          item.createdAt,
          item.evidence,
        );
        if (typeFilter !== "all" && classified.type !== typeFilter)
          return false;
        if (
          confidenceFilter !== "all" &&
          classified.confidence !== confidenceFilter
        )
          return false;
      }

      return true;
    });
  }, [opportunities, search, sourceFilter, typeFilter, confidenceFilter]);

  return (
    <div className="space-y-4">
      {/* Feed Controls Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-card/50 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <SearchInput
              value={search}
              onValueChange={(value) => {
                setSearch(value);
                updateUrl("q", value);
              }}
              placeholder="Search by keywords, skills, projects..."
              shortcutHint="⌘K"
            />
          </div>

          {/* Right Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Source select */}
            <Select
              value={sourceFilter}
              onValueChange={(val) => setSourceFilter(val as HuntSource)}
            >
              <SelectTrigger className="h-8 text-xs font-mono w-[130px] bg-secondary/50 border-border">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="github">GitHub</SelectItem>
                <SelectItem value="rss">RSS Feeds</SelectItem>
              </SelectContent>
            </Select>

            {/* Confidence select */}
            <Select
              value={confidenceFilter}
              onValueChange={(value) => {
                setConfidenceFilter(value);
                updateUrl("confidence", value);
              }}
            >
              <SelectTrigger className="h-8 text-xs font-mono w-[140px] bg-secondary/50 border-border">
                <SelectValue placeholder="Confidence" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed Only</SelectItem>
                <SelectItem value="SPECULATIVE">Prospect Signals</SelectItem>
                <SelectItem value="STALE">Stale Listings</SelectItem>
              </SelectContent>
            </Select>

            {/* Run Hunt Trigger */}
            {showHuntControl && (
              <Button
                variant="default"
                size="sm"
                disabled={isHunting}
                onClick={handleHunt}
                className="gap-1.5 h-8 font-mono text-xs font-semibold"
              >
                {isHunting ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <Radar className="size-3.5" />
                )}
                <span>{isHunting ? "Hunting..." : "Run Hunt"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2.5">
          <Tabs
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value);
              updateUrl("type", value);
            }}
            className="w-auto"
          >
            <TabsList className="h-7 bg-secondary/60 p-0.5">
              <TabsTrigger
                value="all"
                className="text-[11px] h-6 px-2.5 font-mono"
              >
                All Types
              </TabsTrigger>
              <TabsTrigger
                value="BOUNTY"
                className="text-[11px] h-6 px-2.5 font-mono"
              >
                Bounties
              </TabsTrigger>
              <TabsTrigger
                value="GRANT"
                className="text-[11px] h-6 px-2.5 font-mono"
              >
                Grants
              </TabsTrigger>
              <TabsTrigger
                value="JOB"
                className="text-[11px] h-6 px-2.5 font-mono"
              >
                Jobs
              </TabsTrigger>
              <TabsTrigger
                value="SIGNAL"
                className="text-[11px] h-6 px-2.5 font-mono"
              >
                Signals
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
            {huntMessage && (
              <span className="text-primary truncate">{huntMessage}</span>
            )}
            <span>
              {filtered.length} {filtered.length === 1 ? "result" : "results"}
            </span>
          </div>
        </div>
      </div>

      {/* Opportunity Card List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Radar}
          title="No opportunities found"
          description={
            search || sourceFilter !== "all" || typeFilter !== "all"
              ? "No signals match the current filters. Try resetting search or changing categories."
              : "No opportunity signals have been discovered yet. Run the discovery hunt to scrape live Web3 sources."
          }
          action={
            search || sourceFilter !== "all" || typeFilter !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSourceFilter("all");
                  setTypeFilter("all");
                  setConfidenceFilter("all");
                  router.push("?", { scroll: false });
                }}
              >
                Reset Filters
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleHunt}
                disabled={isHunting}
              >
                <Radar className="size-3.5 mr-1.5" />
                <span>Run Discovery Hunt</span>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onOpenDetails={(item) => setSelectedOpportunity(item)}
            />
          ))}
        </div>
      )}

      {/* Detail Slideout Sheet */}
      <OpportunityDetailSheet
        opportunity={selectedOpportunity}
        open={Boolean(selectedOpportunity)}
        onOpenChange={(open) => !open && setSelectedOpportunity(null)}
      />
    </div>
  );
}
