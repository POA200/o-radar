"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps extends Omit<React.ComponentProps<typeof Input>, "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  shortcutHint?: string;
  onClear?: () => void;
}

export function SearchInput({
  value,
  onValueChange,
  shortcutHint,
  onClear,
  placeholder = "Search opportunities...",
  className,
  ...props
}: SearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative flex items-center w-full min-w-[200px]", className)}>
      <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 pl-8 pr-12 text-xs bg-card/60 border-border/80 focus-visible:ring-primary/40 focus-visible:border-primary placeholder:text-muted-foreground/70"
        {...props}
      />
      <div className="absolute right-2 flex items-center gap-1">
        {value && (
          <button
            type="button"
            onClick={() => {
              onValueChange("");
              onClear?.();
              inputRef.current?.focus();
            }}
            className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
            aria-label="Clear search"
          >
            <X className="size-3" />
          </button>
        )}
        {shortcutHint && !value && (
          <kbd className="pointer-events-none hidden h-4 select-none items-center gap-0.5 rounded border border-border bg-secondary px-1 font-mono text-[9px] font-medium text-muted-foreground sm:flex">
            {shortcutHint}
          </kbd>
        )}
      </div>
    </div>
  );
}

