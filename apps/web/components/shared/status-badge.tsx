import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusType =
  | "DISCOVERED"
  | "QUALIFIED"
  | "CONTACTED"
  | "CONVERTED"
  | "ARCHIVED"
  | "CONFIRMED"
  | "SPECULATIVE"
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  dot?: boolean;
  className?: string;
}

const statusStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  CONFIRMED: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  SPECULATIVE: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  CONVERTED: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  QUALIFIED: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-400",
  },
  CONTACTED: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
    dot: "bg-indigo-400",
  },
  DISCOVERED: {
    bg: "bg-zinc-500/10",
    text: "text-zinc-300",
    border: "border-zinc-500/30",
    dot: "bg-zinc-400",
  },
  ARCHIVED: {
    bg: "bg-zinc-800/20",
    text: "text-muted-foreground",
    border: "border-border/40",
    dot: "bg-muted-foreground/60",
  },
};

export function StatusBadge({ status, label, dot = true, className }: StatusBadgeProps) {
  const normalized = status.toUpperCase();
  const style = statusStyles[normalized] ?? {
    bg: "bg-secondary",
    text: "text-secondary-foreground",
    border: "border-border",
    dot: "bg-muted-foreground",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 px-2 py-0.5 font-mono text-[10px] tracking-wide font-normal uppercase",
        style.bg,
        style.text,
        style.border,
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full shrink-0", style.dot)} />}
      <span>{label ?? status.replaceAll("_", " ")}</span>
    </Badge>
  );
}

