export const LISTING_LEAD_STATUS_LABELS: Record<string, string> = {
  DISCOVERED: "Discovered",
  RESEARCHING: "Researching",
  QUALIFIED: "Ready to Contact",
  CONTACTED: "Contacted",
  REPLIED: "Replied",
  IN_PROGRESS: "Negotiating",
  WON: "Successful",
  LOST: "Rejected",
  CONVERTED: "Listed",
  ARCHIVED: "Archived",
};

export function listingLeadStatusLabel(status: string): string {
  return LISTING_LEAD_STATUS_LABELS[status] ?? status;
}

export type FollowUpBucket = "all" | "overdue" | "today" | "upcoming" | "none";

export function followUpBucket(nextFollowUpAt: string | null): FollowUpBucket {
  if (!nextFollowUpAt) return "none";
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const d = new Date(nextFollowUpAt);
  if (d < todayStart) return "overdue";
  if (d < todayEnd) return "today";
  return "upcoming";
}

export function isOverdue(nextFollowUpAt: string | null): boolean {
  return followUpBucket(nextFollowUpAt) === "overdue";
}

export function isDueToday(nextFollowUpAt: string | null): boolean {
  return followUpBucket(nextFollowUpAt) === "today";
}
