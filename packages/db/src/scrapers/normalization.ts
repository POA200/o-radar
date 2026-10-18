import type { OpportunityCategory, OpportunityConfidence } from "@prisma/client";

export type NormalizedClassification = {
  category: OpportunityCategory;
  confidence: OpportunityConfidence;
  sourceQuality: number;
  score: number;
};

const explicitRequest = /\b(looking for|hiring|apply|paid|compensation|reward|bounty|grant|rfp|contributors? wanted)\b/i;

export function classifyExternalRecord(
  title: string,
  content: string,
  publishedAt?: Date,
  options: { official?: boolean; explicitReward?: boolean } = {},
): NormalizedClassification {
  const combined = `${title} ${content}`;
  const ageInDays = publishedAt ? (Date.now() - publishedAt.getTime()) / 86_400_000 : 0;
  const stale = ageInDays > 45;
  const category = classifyCategory(title, content);
  const explicit = explicitRequest.test(combined);
  const sourceQuality = Math.min(
    100,
    (options.official ? 25 : 10) +
      (explicit ? 30 : 0) +
      (options.explicitReward ? 25 : 0) +
      (publishedAt ? 20 : 0),
  );

  return {
    category,
    confidence: stale ? "STALE" : explicit ? "CONFIRMED" : "SPECULATIVE",
    sourceQuality,
    score: Math.min(100, sourceQuality + (category === "SIGNAL" ? 0 : 10)),
  };
}

export function classifyCategory(title: string, content: string): OpportunityCategory {
  const titleAndContent = `${title} ${content}`;
  if (/\b(hackathon|buidlathon|accelerator)\b/i.test(titleAndContent)) return "HACKATHON";
  if (/\b(bounty|bug bounty|paid task|reward)\b/i.test(titleAndContent)) return "BOUNTY";
  if (/\b(grant|grants|rfp|fellowship)\b/i.test(titleAndContent)) return "GRANT";
  if (/\b(hiring|job opening|career|full[- ]time|part[- ]time|contractor)\b/i.test(titleAndContent)) return "JOB";
  if (/\b(contributor|designer|developer|engineer|moderator|content creator)s? wanted\b/i.test(titleAndContent)) return "CONTRIBUTOR_REQUEST";
  return "SIGNAL";
}

export function parsePublishedDate(value?: string): Date | undefined {
  if (!value?.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function isRelevantGitHubIssue(title: string, body: string | null, labels: string[], state: string): boolean {
  if (state !== "open") return false;
  const text = `${title} ${body ?? ""}`;
  if (/\b(fixed|resolved|duplicate|wontfix|not planned)\b/i.test(text)) return false;
  return explicitRequest.test(text) || labels.some((label) => /bounty|grant|hiring|good first issue|paid/i.test(label));
}