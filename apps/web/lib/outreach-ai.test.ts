import assert from "node:assert/strict";
import test from "node:test";
import { hasStrongResearchSignal, generateOutreachFallback } from "./outreach-ai";

test("no meaningful research produces generic pitches", () => {
  const r = generateOutreachFallback({ type: "listing", projectName: "Alpha", tokenSymbol: "ALP", chain: "Solana" });
  assert.ok(r.normal.includes("CEX listing"));
  assert.ok(!r.normal.includes("Best,"));
});

test("metadata alone is not strong research", () => {
  assert.equal(hasStrongResearchSignal({ type: "listing", projectName: "Alpha", tokenSymbol: "ALP", chain: "Solana", websiteUrl: "https://a.com" }), false);
});

test("specific research evidence is strong", () => {
  assert.equal(hasStrongResearchSignal({ type: "listing", projectName: "Alpha", notes: "Announced expansion into Base and new DEX pools last week with verified traction." }), true);
});

test("AI failure fallback is CEX-focused", () => {
  const r = generateOutreachFallback({ type: "listing", projectName: "Alpha" });
  assert.ok(r.normal.toLowerCase().includes("cex"));
  assert.ok(!r.normal.includes("Best,"));
});
