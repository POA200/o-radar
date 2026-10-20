export const LEAD_STATUS_LABELS: Record<string, string> = {
  DISCOVERED: "Discovered",
  RESEARCHING: "Researching",
  QUALIFIED: "Shortlisted",
  READY_TO_CONTACT: "Ready to Contact",
  CONTACTED: "Contacted",
  REPLIED: "Replied",
  APPLIED: "Applied",
  IN_PROGRESS: "In Progress",
  WON: "Successful",
  LOST: "Rejected",
  CONVERTED: "Converted",
  ARCHIVED: "Archived",
};

export function leadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status] ?? status;
}

export function followUpBucket(nextFollowUpAt: string | null): "all" | "overdue" | "today" | "upcoming" | "none" {
  if (!nextFollowUpAt) return "none";
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const d = new Date(nextFollowUpAt);
  if (d < start) return "overdue";
  if (d < end) return "today";
  return "upcoming";
}
