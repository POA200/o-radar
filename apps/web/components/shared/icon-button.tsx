import * as React from "react";
import { Button, type buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

interface IconButtonProps extends React.ComponentProps<typeof Button> {
  label: string;
  tooltip?: string;
  icon: React.ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, tooltip, icon, className, size = "icon-sm", variant = "ghost", ...props }, ref) => {
    const button = (
      <Button
        ref={ref}
        aria-label={label}
        className={cn("shrink-0 text-muted-foreground hover:text-foreground", className)}
        size={size}
        variant={variant}
        {...props}
      >
        {icon}
        <span className="sr-only">{label}</span>
      </Button>
    );

    if (tooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  },
);
IconButton.displayName = "IconButton";

