import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveContainerProps extends React.ComponentProps<"div"> {
  size?: "sm" | "default" | "wide" | "full";
}

const sizeClasses = {
  sm: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-full",
};

export function ResponsiveContainer({
  className,
  size = "default",
  children,
  ...props
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8", sizeClasses[size], className)}
      {...props}
    >
      {children}
    </div>
  );
}

