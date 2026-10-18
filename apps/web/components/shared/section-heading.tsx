import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  title,
  description,
  eyebrow,
  actions,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-border/60 pb-3",
        className,
      )}
    >
      <div className="space-y-0.5">
        {eyebrow && (
          <span className="font-mono text-[9px] font-semibold tracking-widest text-primary uppercase">
            {eyebrow}
          </span>
        )}
        <h2 className="text-base font-medium tracking-tight text-foreground sm:text-lg">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

