export type LeadSummaryInput = {
  projectName?: string | null;
  opportunityTitle?: string | null;
  handle?: string | null;
  platform?: string | null;
  tokenSymbol?: string | null;
  chain?: string | null;
  contractAddress?: string | null;
  websiteUrl?: string | null;
  xUrl?: string | null;
  telegramUrl?: string | null;
  discordUrl?: string | null;
  listingStatus?: string | null;
  status?: string | null;
  priority?: number | null;
  nextFollowUpAt?: string | Date | null;
  notes?: string | null;
  whyInteresting?: string | null;
  nextAction?: string | null;
  outcome?: string | null;
};

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (isNaN(dt.getTime())) return "—";
    return dt.toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

function clean(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") {
    const t = v.trim();
    return t.length === 0 ? "—" : t;
  }
  return String(v);
}

export function buildLeadSummary(input: LeadSummaryInput): string {
  const name = input.projectName ?? input.opportunityTitle ?? input.handle ?? "Unknown";
  const lines = [
    `Project: ${name}`,
    `Symbol: ${clean(input.tokenSymbol)}`,
    `Chain: ${clean(input.chain)}`,
    `Handle/Platform: ${input.handle ?? "—"}${input.platform ? ` (${input.platform})` : ""}`,
    `Contract: ${clean(input.contractAddress)}`,
    `Website: ${clean(input.websiteUrl)}`,
    `X: ${clean(input.xUrl)}`,
    `Telegram: ${clean(input.telegramUrl)}`,
    `Discord: ${clean(input.discordUrl)}`,
    `Status: ${clean(input.listingStatus ?? input.status)}`,
    `Priority: ${input.priority ?? "—"}`,
    `Next follow-up: ${fmtDate(input.nextFollowUpAt)}`,
    `Why interesting: ${clean(input.whyInteresting)}`,
    `Next action: ${clean(input.nextAction)}`,
    `Outcome: ${clean(input.outcome)}`,
    `Notes: ${clean(input.notes)}`,
  ];
  return lines.join("\n");
}

export const buildSummary = buildLeadSummary;

export type OutreachDraftInput = {
  projectName?: string | null;
  opportunityTitle?: string | null;
  handle?: string | null;
  tokenSymbol?: string | null;
  chain?: string | null;
  websiteUrl?: string | null;
  whyInteresting?: string | null;
  skills?: string[] | null;
};

export function buildOutreachDraft(input: OutreachDraftInput): string {
  const name = input.projectName ?? input.opportunityTitle ?? input.handle ?? "your project";
  const token = input.tokenSymbol ? ` ${input.tokenSymbol} token` : "";
  const chainPart = input.chain ? ` on ${input.chain}` : "";
  const websitePart = input.websiteUrl
    ? `I came across ${input.websiteUrl} and it looks like you're building something interesting.`
    : `I noticed your${token} project${chainPart}.`;
  const reasonPart = input.whyInteresting
    ? `\n\n${input.whyInteresting}`
    : "";

  return `Hi ${name} team,

${websitePart}${reasonPart}

I'd be happy to help with design, frontend development, or product work tailored to your goals. If there's anything you're looking to ship or improve right now, I'd love to chat.

Best,
[Your Name]`;
}

export const buildDraft = buildOutreachDraft;
