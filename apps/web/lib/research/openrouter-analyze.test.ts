import assert from "node:assert/strict";
import test from "node:test";
import { analyzeWithOpenRouter } from "./openrouter-analyze";

function mockFetch(responses: any[]) {
  let i = 0;
  (global as any).fetch = async () => {
    const r = responses[i++];
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      text: async () => r.body || "",
      json: async () => r.json || {},
    };
  };
}

test("primary success no fallback", async () => {
  process.env.OPENROUTER_API_KEY = "test";
  let calls = 0;
  (global as any).fetch = async () => {
    calls++;
    return { ok: true, status: 200, text: async () => "", json: async () => ({ choices: [{ message: { content: '{"summary":"ok","findings":{},"sources":[],"confidence":50}' } }] }) };
  };
  const r = await analyzeWithOpenRouter("ev", "QUICK");
  assert.equal(r.summary, "ok");
  assert.equal(calls, 1);
  delete process.env.OPENROUTER_API_KEY;
});

test("primary 429 then fallback success", async () => {
  process.env.OPENROUTER_API_KEY = "test";
  let calls = 0;
  (global as any).fetch = async () => {
    calls++;
    if (calls === 1) return { ok: false, status: 429, text: async () => "rate limited", json: async () => ({}) };
    return { ok: true, status: 200, text: async () => "", json: async () => ({ choices: [{ message: { content: '{"summary":"fallback","findings":{},"sources":[],"confidence":40}' } }] }) };
  };
  const r = await analyzeWithOpenRouter("ev", "QUICK");
  assert.equal(r.summary, "fallback");
  assert.equal(calls, 2);
  delete process.env.OPENROUTER_API_KEY;
});

test("non-retryable 401 no fallback", async () => {
  process.env.OPENROUTER_API_KEY = "test";
  let calls = 0;
  (global as any).fetch = async () => {
    calls++;
    return { ok: false, status: 401, text: async () => "unauth", json: async () => ({}) };
  };
  const r = await analyzeWithOpenRouter("ev", "QUICK");
  assert.equal(r, null);
  assert.equal(calls, 1);
  delete process.env.OPENROUTER_API_KEY;
});

test("both fail returns null", async () => {
  process.env.OPENROUTER_API_KEY = "test";
  (global as any).fetch = async () => ({ ok: false, status: 429, text: async () => "rl", json: async () => ({}) });
  const r = await analyzeWithOpenRouter("ev", "QUICK");
  assert.equal(r, null);
  delete process.env.OPENROUTER_API_KEY;
});
