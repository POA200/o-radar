"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

export function CopySummaryButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Copy className="size-3.5" />
      {copied ? "Copied" : "Copy summary"}
    </Button>
  );
}
