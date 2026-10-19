// Updated matching implementation with three separate scores

export type MatchingProfile = {
  niche?: string | null;
  targetRoles: string[];
  targetChains: string[];
  skills: string[];
  cvText?: string | null;
};

export type MatchingOpportunity = {
  title: string;
  content: string;
  source: string;
  score: number;
  // Optional publication date for freshness calculations
  publishedAt?: string; // ISO 8601 string
};

export type PersonalMatch = {
  score: number;
  reasons: string[];
  matchedRoles: string[];
  matchedChains: string[];
  matchedSkills: string[];
  matchedExperience: string[];
};

export type Credibility = {
  score: number;
  evidenceSources: string[];
  completeness: number; // 0‑1 range
};

export type Freshness = {
  score: number;
  daysSincePublish: number;
};

export type OpportunityMatch = {
  personal: PersonalMatch;
  credibility: Credibility;
  freshness: Freshness;
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function containsTerm(text: string, term: string): boolean {
  const normalizedText = normalize(text);
  const normalizedTerm = normalize(term);

  if (!normalizedTerm) return false;

  return ` ${normalizedText} `.includes(` ${normalizedTerm} `);
}

function findMatches(text: string, terms: string[]): string[] {
  return [...new Set(terms.filter((term) => containsTerm(text, term)))];
}

/** Personal match calculation – unchanged weighting, now returns a structured object */
function calcPersonalMatch(
  profile: MatchingProfile,
  opportunity: MatchingOpportunity,
): PersonalMatch {
  const title = normalize(opportunity.title);
  const content = normalize(opportunity.content);
  const searchable = `${title} ${content}`;
  const reasons: string[] = [];

  const matchedRoles = findMatches(searchable, profile.targetRoles);
  const matchedChains = findMatches(searchable, profile.targetChains);
  const matchedSkills = findMatches(searchable, profile.skills);

  let points = 0;

  // Roles – strongest personalization signal
  if (matchedRoles.length > 0) {
    points += Math.min(35, matchedRoles.length * 20);
    reasons.push(`Matches your role: ${matchedRoles.join(", ")}`);
  }

  if (matchedChains.length > 0) {
    points += Math.min(20, matchedChains.length * 12);
    reasons.push(`Relevant ecosystem: ${matchedChains.join(", ")}`);
  }

  if (matchedSkills.length > 0) {
    points += Math.min(25, matchedSkills.length * 10);
    reasons.push(`Uses your skills: ${matchedSkills.join(", ")}`);
  }

  if (profile.niche && containsTerm(searchable, profile.niche)) {
    points += 10;
    reasons.push(`Matches your focus: ${profile.niche}`);
  }

  const experienceTerms = (profile.cvText ?? "")
    .split(/[;,\n|]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3)
    .slice(0, 30);

  const matchedExperience = findMatches(searchable, experienceTerms);

  if (matchedExperience.length > 0) {
    points += Math.min(10, matchedExperience.length * 5);
    reasons.push(`Relevant experience: ${matchedExperience.slice(0, 3).join(", ")}`);
  }

  // Cap at 100 (personal match only)
  points = Math.min(100, points);

  if (reasons.length === 0) {
    reasons.push("No strong profile match yet");
  }

  return {
    score: points,
    reasons,
    matchedRoles,
    matchedChains,
    matchedSkills,
    matchedExperience,
  };
}

/** Credibility calculation – based on source presence, metadata completeness and evidence quality */
function calcCredibility(opportunity: MatchingOpportunity): Credibility {
  const hasSource = Boolean(opportunity.source?.trim());
  const hasTitle = Boolean(opportunity.title?.trim());
  const hasContent = Boolean(opportunity.content?.trim());
  const hasScore = typeof opportunity.score === "number";

  // Simple heuristic for evidence source type
  const sourceType = opportunity.source?.split(":")[0]?.toLowerCase() ?? "unknown";
  const evidenceSources: string[] = [];
  let sourcePoints = 0;
  if (sourceType.includes("github")) {
    sourcePoints = 20;
    evidenceSources.push("GitHub");
  } else if (sourceType.includes("blog")) {
    sourcePoints = 15;
    evidenceSources.push("Blog");
  } else if (sourceType.includes("forum")) {
    sourcePoints = 10;
    evidenceSources.push("Forum");
  } else {
    sourcePoints = 5;
    evidenceSources.push("Unknown");
  }

  const completeness = [hasSource, hasTitle, hasContent, hasScore].filter(Boolean).length / 4;

  const rawScore = (hasSource ? 30 : 0) + (hasTitle && hasContent ? 20 : 0) + sourcePoints + completeness * 20;
  const score = Math.min(100, Math.round(rawScore));

  return { score, evidenceSources, completeness };
}

/** Freshness calculation – newer items receive higher scores */
function calcFreshness(opportunity: MatchingOpportunity): Freshness {
  const published = opportunity.publishedAt ? new Date(opportunity.publishedAt) : new Date();
  const now = new Date();
  const diffMs = now.getTime() - published.getTime();
  const days = Math.max(0, Math.floor(diffMs / 86400000));

  let score: number;
  if (days <= 30) score = 100;
  else if (days <= 90) score = 70;
  else if (days <= 180) score = 40;
  else score = 10;

  return { score, daysSincePublish: days };
}

/** Main exported matcher – returns three independent scores */
export function matchOpportunity(
  profile: MatchingProfile,
  opportunity: MatchingOpportunity,
): OpportunityMatch {
  const personal = calcPersonalMatch(profile, opportunity);
  const credibility = calcCredibility(opportunity);
  const freshness = calcFreshness(opportunity);
  return { personal, credibility, freshness };
}

/** Comparator for sorting opportunities by usefulness */
export function compareOpportunities(a: OpportunityMatch, b: OpportunityMatch): number {
  // Higher personal match first
  if (a.personal.score !== b.personal.score) {
    return b.personal.score - a.personal.score;
  }
  // Then credibility
  if (a.credibility.score !== b.credibility.score) {
    return b.credibility.score - a.credibility.score;
  }
  // Finally freshness
  return b.freshness.score - a.freshness.score;
}
