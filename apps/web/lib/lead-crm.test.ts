import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

const leadStatusSchema = z.enum([
  "DISCOVERED","RESEARCHING","QUALIFIED","READY_TO_CONTACT","CONTACTED",
  "REPLIED","APPLIED","IN_PROGRESS","WON","LOST","CONVERTED","ARCHIVED",
]);

test("Lead status enum accepts valid statuses", () => {
  for (const s of ["DISCOVERED","QUALIFIED","ARCHIVED"]) {
    assert.equal(leadStatusSchema.safeParse(s).success, true);
  }
});

test("Lead status enum rejects invalid statuses", () => {
  assert.equal(leadStatusSchema.safeParse("HOLD").success, false);
  assert.equal(leadStatusSchema.safeParse("").success, false);
});

test("Lead summary omits missing fields without inventing data", () => {
  const summary = buildSummary({
    projectName: "Test Token",
    tokenSymbol: null,
    chain: null,
    contractAddress: null,
    websiteUrl: null,
    listingStatus: "DISCOVERED",
    priority: 1,
    nextFollowUpAt: null,
    notes: null,
  });
  assert.ok(summary.includes("Test Token"));
  assert.ok(!summary.includes("null"));
  assert.ok(!summary.includes("undefined"));
});

test("Outreach draft handles missing evidence", () => {
  const draft = buildDraft({
    projectName: "Test Token",
    tokenSymbol: null,
    chain: null,
    websiteUrl: null,
  });
  assert.ok(draft.includes("Test Token"));
  assert.ok(draft.includes("listing"));
});

function buildSummary(input: any) {
  return `Project: ${input.projectName}\nSymbol: ${input.tokenSymbol ?? "—"}\nChain: ${input.chain ?? "—"}\nContract: ${input.contractAddress ?? "—"}\nWebsite: ${input.websiteUrl ?? "—"}\nStatus: ${input.listingStatus}\nPriority: ${input.priority}\nNext follow-up: ${input.nextFollowUpAt ?? "—"}\nNotes: ${input.notes ?? "—"}`;
}

function buildDraft(input: any) {
  return `Hi ${input.projectName} team,\n\nI noticed your ${input.tokenSymbol ?? "token"} project on ${input.chain ?? "chain"}. ${input.websiteUrl ? "Your website (" + input.websiteUrl + ") looks active." : ""}\n\nI can help with listing/compliance outreach. Would you be open to a quick chat?\n\nBest,`;
}
