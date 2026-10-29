import assert from "node:assert/strict";
import test from "node:test";
import { runResearchCoordinator } from "./research-coordinator";

test("unauthenticated rejected", async () => {
  await assert.rejects(() => runResearchCoordinator({ user: null as any, leadId: "l1", mode: "QUICK", deps: {} as any }), /Unauthenticated/);
});

test("unauthorized lead rejected before external calls", async () => {
  let called = false;
  const deps = {
    findLead: async () => null,
    collectPages: async () => { called = true; return []; },
    fetchMarket: async () => null,
    analyze: async () => null,
    persist: async () => ({}),
  } as any;
  await assert.rejects(() => runResearchCoordinator({ user: { id: "u1" }, leadId: "l1", mode: "QUICK", deps }), /Lead not found/);
  assert.equal(called, false);
});

test("authorized persists with userId", async () => {
  const deps = {
    findLead: async () => ({ id: "l1", websiteUrl: "https://x.com", chain: null, contractAddress: null }),
    collectPages: async () => [{ url: "https://x.com", title: "T", text: "hi" }],
    fetchMarket: async () => null,
    analyze: async () => ({ summary: "ok", findings: {}, sources: [], confidence: 50 }),
    persist: async (d: any) => d,
  } as any;
  const r: any = await runResearchCoordinator({ user: { id: "u1" }, leadId: "l1", mode: "QUICK", deps });
  assert.equal(r.userId, "u1");
  assert.equal(r.status, "COMPLETED");
});

test("invalid AI not persisted as findings", async () => {
  const deps = {
    findLead: async () => ({ id: "l1", websiteUrl: null, chain: null, contractAddress: null }),
    collectPages: async () => [],
    fetchMarket: async () => null,
    analyze: async () => ({ bad: 1 }),
    persist: async (d: any) => d,
  } as any;
  const r: any = await runResearchCoordinator({ user: { id: "u1" }, leadId: "l1", mode: "QUICK", deps });
  assert.equal(r.status, "FAILED");
  assert.equal(r.findings, null);
});
