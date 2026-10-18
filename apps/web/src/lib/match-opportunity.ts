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
};

export type OpportunityMatch = {
  score: number;
  reasons: string[];
  matchedRoles: string[];
  matchedChains: string[];
  matchedSkills: string[];
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

export function matchOpportunity(
  profile: MatchingProfile,
  opportunity: MatchingOpportunity,
): OpportunityMatch {
  const title = normalize(opportunity.title);
  const content = normalize(opportunity.content);
  const searchable = `${title} ${content}`;
  const reasons: string[] = [];

  const matchedRoles = findMatches(searchable, profile.targetRoles);
  const matchedChains = findMatches(searchable, profile.targetChains);
  const matchedSkills = findMatches(searchable, profile.skills);

  let points = 0;

  // A relevant role is the strongest initial personalization signal.
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
    .split(/[,;\n|]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3)
    .slice(0, 30);

  const matchedExperience = findMatches(searchable, experienceTerms);

  if (matchedExperience.length > 0) {
    points += Math.min(10, matchedExperience.length * 5);
    reasons.push(`Relevant experience: ${matchedExperience.slice(0, 3).join(", ")}`);
  }

  // Keep the existing global score as a small signal-quality bonus,
  // not as a substitute for matching the user's profile.
  const qualityBonus = Math.round(
    Math.max(0, Math.min(100, opportunity.score)) * 0.1,
  );

  points = Math.min(100, points + qualityBonus);

  if (reasons.length === 0) {
    reasons.push("No strong profile match yet");
  }

  return {
    score: points,
    reasons,
    matchedRoles,
    matchedChains,
    matchedSkills,
  };
}
