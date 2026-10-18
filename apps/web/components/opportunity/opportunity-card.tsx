"use client";

import * as React from "react";
import {
  ExternalLink,
  GitPullRequest,
  Rss,
  Bookmark,
  Archive,
  ArrowUpRight,
  Clock,
  Coins,
  ShieldCheck,
  HelpCircle,
  AlertTriangle,
  Building2,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  classifyOpportunity,
  type OpportunityType,
  type ConfidenceState,
} from "@/src/lib/opportunity-classifier";
import { promoteOpportunityToLead, archiveOpportunity } from "@/app/actions";

export interface OpportunityItem {
  id: string;
  title: string;
  source: string;
  url: string;
  content: string;
  score: number;
  matchScore: number;
  matchReasons: string[];
  createdAt: string;
  keywords?: string[];
  evidence?: unknown;
  saved?: boolean;
}

interface OpportunityCardProps {
  opportunity: OpportunityItem;
  onOpenDetails: (opp: OpportunityItem) => void;
  className?: string;
}

function formatFreshness(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Recent";
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

export function OpportunityCard({ opportunity, onOpenDetails, className }: OpportunityCardProps) {
  const [isPending, startTransition] = React.useTransition();
  const [actionType, setActionType] = React.useState<"promote" | "archive" | null>(null);

  const classified = React.useMemo(() => {
    return classifyOpportunity(
      opportunity.title,
      opportunity.content,
      opportunity.url,
      opportunity.createdAt,
      opportunity.evidence,
    );
  }, [opportunity.title, opportunity.content, opportunity.url, opportunity.createdAt, opportunity.evidence]);

  const handlePromote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionType("promote");
    startTransition(async () => {
      await promoteOpportunityToLead(opportunity.id);
    });
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionType("archive");
    startTransition(async () => {
      await archiveOpportunity(opportunity.id);
    });
  };

  // Visual distinction for Confidence state
  const renderConfidenceBadge = () => {
    switch (classified.confidence) {
      case "CONFIRMED":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 gap-1 text-[10px] font-mono font-normal uppercase"
          >
            <ShieldCheck className="size-3" />
            <span>Confirmed</span>
          </Badge>
        );
      case "SPECULATIVE":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-amber-400 gap-1 text-[10px] font-mono font-normal uppercase"
          >
            <HelpCircle className="size-3" />
            <span>Prospect Signal</span>
          </Badge>
        );
      case "STALE":
        return (
          <Badge
            variant="outline"
            className="border-border bg-secondary/60 text-muted-foreground gap-1 text-[10px] font-mono font-normal uppercase"
          >
            <AlertTriangle className="size-3" />
            <span>Stale Listing</span>
          </Badge>
        );
    }
  };

  // Opportunity Type badge
  const renderTypeBadge = () => {
    const type = classified.type;
    const colors: Record<OpportunityType, string> = {
      BOUNTY: "border-primary/40 bg-primary/10 text-primary",
      GRANT: "border-purple-500/40 bg-purple-500/10 text-purple-400",
      JOB: "border-blue-500/40 bg-blue-500/10 text-blue-400",
      HACKATHON: "border-orange-500/40 bg-orange-500/10 text-orange-400",
      SIGNAL: "border-zinc-700 bg-zinc-800/40 text-zinc-300",
    };

    return (
      <Badge
        variant="outline"
        className={cn("text-[10px] font-mono font-medium tracking-wide uppercase", colors[type])}
      >
        {type}
      </Badge>
    );
  };

  return (
    <Card
      className={cn(
        "group relative border-border/80 bg-card/70 hover:bg-card hover:border-border transition-all duration-150 hover:shadow-xs",
        className,
      )}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col gap-3">
        {/* Top Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {renderTypeBadge()}
            {renderConfidenceBadge()}

            {classified.organization && (
              <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <Building2 className="size-3 text-muted-foreground/70" />
                <span className="max-w-[180px] truncate">{classified.organization}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1">
              {opportunity.source === "RSS_FEED" ? (
                <Rss className="size-3 text-amber-400" />
              ) : (
                <GitPullRequest className="size-3 text-primary" />
              )}
              <span className="hidden sm:inline uppercase text-[10px]">
                {opportunity.source === "RSS_FEED" ? "RSS" : "GitHub"}
              </span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              <span>{formatFreshness(opportunity.createdAt)}</span>
            </span>
          </div>
        </div>

        {/* Title and Core Match Header */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onOpenDetails(opportunity)}
            className="text-left font-medium text-sm sm:text-base text-foreground hover:text-primary transition-colors flex items-start justify-between gap-2 group/title cursor-pointer"
          >
            <span className="line-clamp-2">{opportunity.title}</span>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover/title:text-primary transition-colors mt-0.5" />
          </button>

          {/* Explicit Reward & Deadline when known */}
          {(classified.reward || classified.deadline) && (
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              {classified.reward && (
                <span className="inline-flex items-center gap-1 font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  <Coins className="size-3.5" />
                  <span>{classified.reward}</span>
                </span>
              )}
              {classified.deadline && (
                <span className="inline-flex items-center gap-1 font-mono text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded border border-border">
                  <Calendar className="size-3.5" />
                  <span>Due: {classified.deadline}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Personalized Match Reasons */}
        {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {opportunity.matchReasons.map((reason) => (
              <span
                key={reason}
                className="inline-flex items-center rounded border border-border/80 bg-secondary/60 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* Tag pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {classified.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-secondary/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground border border-border/40"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Bottom Actions & Scores Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40 mt-1">
          {/* Match & Signal Metrics */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="grid size-6 place-items-center rounded bg-primary/10 text-primary font-bold text-xs border border-primary/30">
                {opportunity.matchScore}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Match</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <span className="font-mono text-[10px] text-muted-foreground/80">
              {opportunity.score} signal pts
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={opportunity.url}
                  target="_blank"
                  rel="noreferrer"
                  className="grid size-7 place-items-center rounded border border-border/80 bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  <span className="sr-only">Open original source</span>
                </a>
              </TooltipTrigger>
              <TooltipContent side="top">Open source link</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={isPending}
                  onClick={handleArchive}
                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Archive className="size-3.5" />
                  <span className="sr-only">Archive</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Archive opportunity</TooltipContent>
            </Tooltip>

            <Button
              variant={opportunity.saved ? "secondary" : "default"}
              size="xs"
              disabled={isPending}
              onClick={handlePromote}
              className="gap-1.5 font-mono text-[11px]"
            >
              <Bookmark className="size-3" />
              <span>
                {isPending && actionType === "promote"
                  ? "Saving..."
                  : opportunity.saved
                  ? "Saved"
                  : "Save Lead"}
              </span>
            </Button>

            <Button
              variant="outline"
              size="xs"
              onClick={() => onOpenDetails(opportunity)}
              className="text-[11px]"
            >
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

