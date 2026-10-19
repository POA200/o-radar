import type { DexScreenerResult } from "@/app/listing-leads/actions";

export type ProspectScore = {
  score: number;
  label: "High priority" | "Promising" | "Needs review" | "Low priority" | "Insufficient data";
  positives: string[];
  warnings: string[];
  coverage: number;
};

const VOLUME_BANDS: [number, number][] = [
  [1_000_000, 30],
  [100_000, 24],
  [10_000, 16],
  [1_000, 8],
];

const LIQUIDITY_BANDS: [number, number][] = [
  [500_000, 30],
  [100_000, 24],
  [25_000, 16],
  [5_000, 8],
];

function bandPoints(value: number | null, bands: [number, number][], fallback: number): number {
  if (value === null || !Number.isFinite(value) || value <= 0) return 0;
  for (const [threshold, pts] of bands) {
    if (value >= threshold) return pts;
  }
  return fallback;
}

export function scoreProspect(r: DexScreenerResult): ProspectScore {
  const positives: string[] = [];
  const warnings: string[] = [];

  const volPts = bandPoints(r.volume24hUsd, VOLUME_BANDS, 4);
  if (r.volume24hUsd === null) warnings.push("24h volume unavailable");
  else if (r.volume24hUsd > 0) positives.push(`24h volume ${formatShort(r.volume24hUsd)}`);

  const liqPts = bandPoints(r.liquidityUsd, LIQUIDITY_BANDS, 4);
  if (r.liquidityUsd === null) warnings.push("Liquidity unavailable");
  else if (r.liquidityUsd > 0) positives.push(`Liquidity ${formatShort(r.liquidityUsd)}`);

  let socialPts = 0;
  if (r.websiteUrl) { socialPts += 8; positives.push("Website present"); }
  if (r.xUrl) { socialPts += 4; positives.push("X/Twitter present"); }
  if (r.telegramUrl) { socialPts += 4; positives.push("Telegram present"); }
  if (r.discordUrl) { socialPts += 4; positives.push("Discord present"); }
  if (socialPts > 20) socialPts = 20;
  if (!r.websiteUrl && !r.xUrl && !r.telegramUrl && !r.discordUrl) warnings.push("No website or social links");

  let contactPts = 0;
  if (r.telegramUrl) contactPts += 5;
  if (r.discordUrl) contactPts += 5;
  if (contactPts === 0 && (r.xUrl || r.websiteUrl)) warnings.push("No direct contact channel (Telegram/Discord)");

  let identityPts = 0;
  if (r.projectName && r.projectName !== "Unknown token") identityPts += 2;
  if (r.tokenSymbol) identityPts += 2;
  if (r.chain) identityPts += 2;
  if (r.tokenAddress) identityPts += 2;
  if (r.sourceUrl) identityPts += 2;

  if (r.marketCapSource === "fdv") warnings.push("Only FDV available (not market cap)");

  const score = volPts + liqPts + socialPts + contactPts + identityPts;
  const bothMissing = r.volume24hUsd === null && r.liquidityUsd === null;
  const coverage = [r.volume24hUsd, r.liquidityUsd, r.websiteUrl, r.xUrl, r.telegramUrl, r.discordUrl, r.chain, r.tokenAddress, r.sourceUrl]
    .filter((v) => v !== null && v !== undefined && v !== "").length;

  let label: ProspectScore["label"];
  if (bothMissing) label = "Insufficient data";
  else if (score >= 70) label = "High priority";
  else if (score >= 50) label = "Promising";
  else if (score >= 30) label = "Needs review";
  else label = "Low priority";

  return { score, label, positives, warnings, coverage };
}

function formatShort(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}
