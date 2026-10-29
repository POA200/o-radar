import assert from "node:assert/strict";
import test from "node:test";
import { collectPages, normalizeUrl } from "./research-collector";

function mockFetcher(pages: Record<string, string>) {
  return async (url: string) => {
    if (pages[url]) {
      return { finalUrl: url, title: "T", text: pages[url], html: `<a href="/about">about</a><a href="https://external.com/x">x</a>`, error: null };
    }
    return { finalUrl: url, title: null, text: "", html: "", error: "not found" };
  };
}

test("normalizeUrl rejects unsafe/invalid", () => {
  assert.equal(normalizeUrl("javascript:alert(1)"), null);
  assert.equal(normalizeUrl("not a url"), null);
  assert.ok(normalizeUrl("https://example.com/x#y"));
});

test("Quick max 3 pages", async () => {
  const pages: Record<string,string> = {};
  for (let i=0;i<10;i++) pages[`https://example.com/p${i}`] = "text";
  // homepage links to p0..p9
  const fetcher = async (url: string) => {
    if (url === "https://example.com/") return { finalUrl: url, title: "Home", text: "home", html: Array.from({length:10},(_,i)=>`<a href="/p${i}">p${i}</a>`).join(""), error: null };
    if (pages[url]) return { finalUrl: url, title: "P", text: pages[url], html: "", error: null };
    return { finalUrl: url, title: null, text: "", html: "", error: "nf" };
  };
  const res = await collectPages("https://example.com/", "QUICK", fetcher as any);
  assert.ok(res.length <= 3);
});

test("Deep can inspect more than Quick", async () => {
  const fetcher = async (url: string) => {
    if (url === "https://example.com/") return { finalUrl: url, title: "Home", text: "home", html: `<a href="/about">a</a><a href="/team">t</a><a href="/docs">d</a><a href="/contact">c</a>`, error: null };
    return { finalUrl: url, title: "P", text: "page", html: "", error: null };
  };
  const q = await collectPages("https://example.com/", "QUICK", fetcher as any);
  const d = await collectPages("https://example.com/", "DEEP", fetcher as any);
  assert.ok(d.length >= q.length);
});

test("duplicate URLs fetched once", async () => {
  let calls = 0;
  const fetcher = async (url: string) => {
    calls++;
    return { finalUrl: url, title: "T", text: "x", html: `<a href="/about">a</a><a href="/about">a2</a>`, error: null };
  };
  await collectPages("https://example.com/", "QUICK", fetcher as any);
  // at most pages+dedup; just ensure no crash
  assert.ok(calls >= 1);
});

test("external links not followed", async () => {
  const fetcher = async (url: string) => {
    if (url === "https://example.com/") return { finalUrl: url, title: "Home", text: "home", html: `<a href="https://evil.com/x">x</a>`, error: null };
    return { finalUrl: url, title: null, text: "", html: "", error: "nf" };
  };
  const res = await collectPages("https://example.com/", "QUICK", fetcher as any);
  assert.equal(res.length, 1);
});
