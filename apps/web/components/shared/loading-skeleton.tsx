import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  count?: number;
  type?: "card" | "table" | "list";
  className?: string;
}

export function LoadingSkeleton({
  count = 3,
  type = "card",
  className,
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count });

  if (type === "card") {
    return (
      <div className={cn("grid gap-3", className)}>
        {items.map((_, i) => (
          <Card key={i} className="border-border/60 bg-card/60">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3.5 w-full" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className={cn("space-y-2 border border-border/60 rounded-md p-4 bg-card/40", className)}>
        <Skeleton className="h-7 w-full" />
        {items.map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

