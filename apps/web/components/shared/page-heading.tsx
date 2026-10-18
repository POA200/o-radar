import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeadingProps {
  title: string;
  description?: string;
  eyebrow?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  className?: string;
}

export function PageHeading({
  title,
  description,
  eyebrow,
  badge,
  actions,
  stats,
  className,
}: PageHeadingProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="font-mono text-[10px] font-semibold tracking-widest text-primary uppercase">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {(actions || stats) && (
        <div className="flex items-center gap-3 pt-2 md:pt-0">
          {stats}
          {actions}
        </div>
      )}
    </header>
  );
}

