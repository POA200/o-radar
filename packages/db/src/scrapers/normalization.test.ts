import assert from "node:assert/strict";
import test from "node:test";
import { classifyCategory, isRelevantGitHubIssue, parsePublishedDate } from "./normalization.js";

test("normalizes valid and missing publication dates without inventing a date", () => {
  assert.equal(parsePublishedDate("2026-10-01T12:00:00Z")?.toISOString(), "2026-10-01T12:00:00.000Z");
  assert.equal(parsePublishedDate(undefined), undefined);
  assert.equal(parsePublishedDate("not a date"), undefined);
});

test("keeps opportunity categories distinct", () => {
  assert.equal(classifyCategory("Paid Solidity bounty", "Reward: $500"), "BOUNTY");
  assert.equal(classifyCategory("Ecosystem grant program", "Apply by Friday"), "GRANT");
  assert.equal(classifyCategory("Project launch update", "The team shipped a testnet"), "SIGNAL");
});

test("rejects closed, stale-language, and irrelevant GitHub issues", () => {
  assert.equal(isRelevantGitHubIssue("Hiring a designer", "We are looking for help", [], "open"), true);
  assert.equal(isRelevantGitHubIssue("Hiring a designer", "We are looking for help", [], "closed"), false);
  assert.equal(isRelevantGitHubIssue("Bug report", "Fixed in the latest release", [], "open"), false);
});