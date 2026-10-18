export type OpportunityType = "BOUNTY" | "GRANT" | "JOB" | "HACKATHON" | "SIGNAL";
export type ConfidenceState = "CONFIRMED" | "SPECULATIVE" | "STALE";

export interface ClassifiedOpportunity {
  type: OpportunityType;
  confidence: ConfidenceState;
  reward?: string;
  deadline?: string;
  organization?: string;
  tags: string[];
}

const KNOWN_SKILLS = [
  "solidity", "rust", "typescript", "react", "next.js", "tailwind",
  "frontend", "backend", "design", "ui/ux", "product design",
  "smart contracts", "security", "audit", "defi", "nft", "dao",
  "community", "growth", "content", "research", "zero knowledge", "zk",
  "solana", "ethereum", "base", "arbitrum", "optimism", "polygon", "stacks"
];

export function classifyOpportunity(
  title: string,
  content: string,
  url: string,
  createdAt: Date | string,
  evidence?: unknown,
): ClassifiedOpportunity {
  const combined = `${title} ${content}`.toLowerCase();
  const createdDate = new Date(createdAt);
  const ageInDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

  // 1. Determine Organization
  let organization: string | undefined;
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes("github.com")) {
      const parts = parsedUrl.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        organization = `${parts[0]}/${parts[1]}`;
      }
    } else {
      if (evidence && typeof evidence === "object" && !Array.isArray(evidence)) {
        const feedTitle = (evidence as { feedTitle?: unknown }).feedTitle;
        if (typeof feedTitle === "string" && feedTitle.trim()) {
          organization = feedTitle.trim();
        }
      }
      if (!organization) {
        organization = parsedUrl.hostname.replace(/^www\./, "");
      }
    }
  } catch {
    organization = undefined;
  }

  // 2. Determine Type
  let type: OpportunityType = "SIGNAL";
  if (/\b(hackathon|buidlathon)\b/i.test(title)) {
    type = "HACKATHON";
  } else if (/\b(bounty|bug bounty|reward)\b/i.test(title)) {
    type = "BOUNTY";
  } else if (/\b(grant|grants|rfp|fellowship|foundation grant)\b/i.test(title)) {
    type = "GRANT";
  } else if (/\b(hiring|job|full-time|part-time|contractor|senior engineer|staff engineer|designer role)\b/i.test(title)) {
    type = "JOB";
  } else if (/\b(bounty|reward)\b/i.test(content)) {
    type = "BOUNTY";
  } else if (/\b(grant|grants program)\b/i.test(content)) {
    type = "GRANT";
  } else if (/\b(hiring|job opening|apply here)\b/i.test(content)) {
    type = "JOB";
  }

  // 3. Determine Confidence / State
  let confidence: ConfidenceState = "SPECULATIVE";
  if (ageInDays > 45) {
    confidence = "STALE";
  } else if (
    type === "BOUNTY" && /\b(\$|usd|usdc|eth|sol)\b/i.test(combined)
  ) {
    confidence = "CONFIRMED";
  } else if (
    type === "GRANT" && /\b(foundation|dao|program|rfp)\b/i.test(combined)
  ) {
    confidence = "CONFIRMED";
  } else if (
    type === "JOB" && /\b(hiring|careers|apply|position)\b/i.test(title)
  ) {
    confidence = "CONFIRMED";
  } else if (
    /\[(bounty|grant|hiring|job)\]/i.test(title)
  ) {
    confidence = "CONFIRMED";
  }

  // 4. Extract Reward / Compensation when explicitly stated
  let reward: string | undefined;
  const rewardUsdMatch = combined.match(/(?:\$|usd|usdc|usdt)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|\d+[kK]?)\b/);
  const rewardCryptoMatch = combined.match(/\b([0-9]+(?:\.[0-9]+)?)\s*(eth|sol|btc|matic|avax|op|arb)\b/);

  if (rewardUsdMatch?.[1]) {
    const rawVal = rewardUsdMatch[1].toUpperCase();
    reward = rawVal.startsWith("$") ? rawVal : `$${rawVal} USDC`;
  } else if (rewardCryptoMatch?.[1] && rewardCryptoMatch?.[2]) {
    reward = `${rewardCryptoMatch[1]} ${rewardCryptoMatch[2].toUpperCase()}`;
  }

  // 5. Extract Deadline when explicitly stated
  let deadline: string | undefined;
  const deadlineMatch = content.match(/\b(?:deadline|due date|closes on|apply by|ends on)\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?|\d{1,2}\/\d{1,2}\/\d{2,4})\b/i);
  if (deadlineMatch?.[1]) {
    deadline = deadlineMatch[1].trim();
  }

  // 6. Extract Tags & Skills
  const tags = KNOWN_SKILLS.filter((skill) =>
    ` ${combined} `.includes(` ${skill} `)
  ).slice(0, 5);

  return {
    type,
    confidence,
    reward,
    deadline,
    organization,
    tags: tags.length ? tags : ["web3"],
  };
}

