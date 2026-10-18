"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, Bookmark } from "lucide-react";
import { archiveOpportunity, promoteOpportunityToLead } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function OpportunityDetailActions({
  opportunityId,
  saved,
}: {
  opportunityId: string;
  saved: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"save" | "archive" | null>(null);

  function run(nextAction: "save" | "archive") {
    setAction(nextAction);
    startTransition(async () => {
      if (nextAction === "save") await promoteOpportunityToLead(opportunityId);
      else await archiveOpportunity(opportunityId);
      router.push("/discover");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="flex-1 gap-1.5"
        disabled={isPending}
        onClick={() => run("archive")}
      >
        <Archive className="size-3.5" />
        {action === "archive" ? "Archiving..." : "Archive"}
      </Button>
      <Button
        className="flex-1 gap-1.5"
        disabled={isPending}
        onClick={() => run("save")}
      >
        <Bookmark className="size-3.5" />
        {action === "save" ? "Saving..." : saved ? "Saved" : "Save to leads"}
      </Button>
    </div>
  );
}
