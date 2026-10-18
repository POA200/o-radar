"use client";

import * as React from "react";
import {
  ExternalLink,
  Bookmark,
  Archive,
  Calendar,
  Coins,
  Building2,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { classifyOpportunity } from "@/src/lib/opportunity-classifier";
import { promoteOpportunityToLead, archiveOpportunity } from "@/app/actions";
import type { OpportunityItem } from "./opportunity-card";

interface OpportunityDetailSheetProps {
  opportunity: OpportunityItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpportunityDetailSheet({
  opportunity,
  open,
  onOpenChange,
}: OpportunityDetailSheetProps) {
  const [isPending, startTransition] = React.useTransition();
  const [actionType, setActionType] = React.useState<"promote" | "archive" | null>(null);

  if (!opportunity) return null;

  const classified = classifyOpportunity(
    opportunity.title,
    opportunity.content,
    opportunity.url,
    opportunity.createdAt,
    opportunity.evidence,
  );

  const handlePromote = () => {
    setActionType("promote");
    startTransition(async () => {
      await promoteOpportunityToLead(opportunity.id);
      onOpenChange(false);
    });
  };

  const handleArchive = () => {
    setActionType("archive");
    startTransition(async () => {
      await archiveOpportunity(opportunity.id);
      onOpenChange(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl w-full p-0 flex flex-col bg-card border-border">
        {/* Header */}
        <SheetHeader className="p-5 border-b border-border/80">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/40 bg-primary/10 uppercase">
              {classified.type}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border uppercase">
              {classified.confidence}
            </Badge>
            {classified.organization && (
              <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <Building2 className="size-3" />
                <span>{classified.organization}</span>
              </span>
            )}
          </div>
          <SheetTitle className="text-lg font-semibold tracking-tight text-foreground text-left">
            {opportunity.title}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground flex items-center gap-2 text-left pt-1 font-mono">
            <Clock className="size-3" />
            <span>Captured {new Date(opportunity.createdAt).toLocaleDateString()}</span>
            <span>•</span>
            <span>{opportunity.score} signal score</span>
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 p-5 space-y-6">
          {/* Compensation & Deadline Callout */}
          {(classified.reward || classified.deadline) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {classified.reward && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Coins className="size-3 text-primary" />
                    <span>Reward / Budget</span>
                  </span>
                  <p className="mt-1 font-mono text-base font-bold text-primary">{classified.reward}</p>
                </div>
              )}
              {classified.deadline && (
                <div className="rounded-md border border-border bg-secondary/40 p-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3" />
                    <span>Application Deadline</span>
                  </span>
                  <p className="mt-1 font-mono text-sm font-medium text-foreground">{classified.deadline}</p>
                </div>
              )}
            </div>
          )}

          {/* Match Intelligence */}
          <div className="rounded-md border border-border/80 bg-secondary/30 p-4 mb-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Sparkles className="size-3.5 text-primary" />
                <span>Profile Match Analysis</span>
              </span>
              <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/30">
                {opportunity.matchScore} / 100
              </span>
            </div>

            {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
              <div className="space-y-1.5">
                {opportunity.matchReasons.map((reason, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="size-1 rounded-full bg-primary shrink-0" />
                    <span>{reason}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Issue/Post Body */}
          <div className="space-y-2 mb-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Opportunity Details
            </h4>
            <div className="rounded-md border border-border/60 bg-secondary/20 p-4">
              <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap font-sans">
                {opportunity.content || "No body content captured for this record."}
              </p>
            </div>
          </div>

          {/* Raw Evidence Payload */}
          {Boolean(opportunity.evidence) && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Raw Evidence Record
              </h4>
              <div className="rounded-md border border-border bg-[#05080c] p-3 overflow-x-auto">
                <pre className="font-mono text-[11px] text-emerald-400/90 leading-relaxed">
                  {JSON.stringify(opportunity.evidence, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <SheetFooter className="p-4 border-t border-border/80 flex flex-row items-center justify-between gap-2 sm:justify-between bg-card/80">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1.5 text-xs"
          >
            <a href={opportunity.url} target="_blank" rel="noreferrer">
              <span>Open Source</span>
              <ExternalLink className="size-3.5" />
            </a>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={handleArchive}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              <Archive className="size-3.5 mr-1.5" />
              <span>Archive</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              disabled={isPending}
              onClick={handlePromote}
              className="gap-1.5 text-xs font-mono"
            >
              <Bookmark className="size-3.5" />
              <span>{isPending && actionType === "promote" ? "Saving..." : "Save to Leads"}</span>
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
