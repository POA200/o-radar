import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[260px] flex-col items-center justify-center rounded-md border border-dashed border-border/80 bg-card/40 p-8 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-3 grid size-10 place-items-center rounded-md border border-border bg-secondary/50 text-primary">
          <Icon className="size-5" />
        </div>
      )}
      <h3 className="text-sm font-medium tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

