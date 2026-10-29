import dns from "node:dns/promises";
import net from "node:net";

export type FetchWebsiteResult = {
  finalUrl: string;
  title: string | null;
  text: string;
  retrievedAt: string;
  canonicalUrl: string | null;
  error: string | null;
};

const MAX_REDIRECTS = 3;
const MAX_BYTES = 1_000_000;
const MAX_TEXT = 20_000;
const TIMEOUT_MS = 10_000;

function isPrivateIp(ip: string) {
  if (net.isIP(ip) === 4) {
    const parts = ip.split(".").map((x) => Number(x));
    if (parts[0]! === 10) return true;
    if (parts[0]! === 127) return true;
    if (parts[0]! === 169 && parts[1]! === 254) return true;
    if (parts[0]! === 192 && parts[1]! === 168) return true;
    if (parts[0]! === 172 && parts[1]! >= 16 && parts[1]! <= 31) return true;
    if (parts[0]! === 0) return true;
    if (parts[0]! === 100 && parts[1]! >= 64 && parts[1]! <= 127) return true;
    return false;
  }
  if (net.isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fe80:")) return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("::ffff:127.")) return true;
    return false;
  }
  return true;
}

async function validateUrl(url: string) {
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("Invalid URL"); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Unsupported protocol");
  if (parsed.username || parsed.password) throw new Error("Credentials not allowed");
  const host = parsed.hostname;
  if (!host) throw new Error("Missing host");
  const ips = await dns.lookup(host, { all: true });
  if (!ips.length) throw new Error("DNS resolution failed");
  for (const { address } of ips) {
    if (isPrivateIp(address)) throw new Error("Private or reserved address");
  }
  return parsed;
}

async function fetchWithLimits(url: URL): Promise<{ finalUrl: string; title: string | null; text: string; canonicalUrl: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let current = url;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      await validateUrl(current.toString());
      const res = await fetch(current.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "O-Radar/1.0", Accept: "text/html,application/xhtml+xml" },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) throw new Error("Redirect without location");
        if (i === MAX_REDIRECTS) throw new Error("Too many redirects");
        current = new URL(loc, current);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("text/html") && !ct.includes("application/xhtml+xml")) throw new Error("Unsupported content type");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > MAX_BYTES) { reader.cancel(); throw new Error("Response too large"); }
          chunks.push(value);
        }
      }
      const html = new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch && titleMatch[1] ? titleMatch[1].replace(/\s+/g, " ").trim() : null;
      const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
      const canonicalUrl = canonicalMatch && canonicalMatch[1] ? canonicalMatch[1] : null;
      // strip scripts/styles
      let clean = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
      // remove tags
      clean = clean.replace(/<[^>]+>/g, " ");
      // decode basic entities
      clean = clean.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
      clean = clean.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
      return { finalUrl: current.toString(), title, text: clean, canonicalUrl };
    }
    throw new Error("Too many redirects");
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWebsite(url: string): Promise<FetchWebsiteResult> {
  const retrievedAt = new Date().toISOString();
  try {
    const validated = await validateUrl(url);
    const result = await fetchWithLimits(validated);
    return { ...result, retrievedAt, error: null };
  } catch (e) {
    return { finalUrl: url, title: null, text: "", retrievedAt, canonicalUrl: null, error: e instanceof Error ? e.message : String(e) };
  }
}
