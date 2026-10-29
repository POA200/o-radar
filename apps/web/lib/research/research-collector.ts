import { fetchWebsite } from "./fetch-website";

export type ResearchMode = "QUICK" | "DEEP";

export type CollectedPage = { url: string; title: string | null; text: string };

export type Fetcher = (url: string) => Promise<{ finalUrl: string; title: string | null; text: string; html: string; error: string | null }>;

const LIMITS: Record<ResearchMode, { maxPages: number; maxTextPerPage: number; totalTextLimit: number; keywords: string[] }> = {
  QUICK: { maxPages: 3, maxTextPerPage: 1500, totalTextLimit: 4000, keywords: ["about","token","exchange","listing","contact"] },
  DEEP: { maxPages: 10, maxTextPerPage: 4000, totalTextLimit: 12000, keywords: ["about","team","tokenomics","roadmap","docs","documentation","ecosystem","partners","announcement","contact"] },
};

export function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (!u.protocol.startsWith("http")) return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export async function collectPages(websiteUrl: string, mode: ResearchMode, fetcher: Fetcher = fetchWebsite as any): Promise<CollectedPage[]> {
  const limits = LIMITS[mode];
  const visited = new Set<string>();
  const pages: CollectedPage[] = [];

  async function collect(url: string) {
    if (visited.size >= limits.maxPages) return;
    const normalized = normalizeUrl(url);
    if (!normalized || visited.has(normalized)) return;
    visited.add(normalized);
    const res = await fetcher(normalized);
    if (res.error) return;
    pages.push({ url: res.finalUrl, title: res.title, text: res.text.slice(0, limits.maxTextPerPage) });
    if (pages.length < limits.maxPages) {
      let origin = "";
      try { origin = new URL(res.finalUrl).origin; } catch { origin = ""; }
      const regex = /href=["']([^"']+)["']/gi;
      let m;
      const candidates: string[] = [];
      while ((m = regex.exec(res.html)) !== null && candidates.length < 20) {
        try {
          const u = new URL(m[1]!, res.finalUrl);
          if (u.origin === origin && u.protocol.startsWith("http")) {
            u.hash = "";
            const href = u.toString();
            if (!visited.has(href)) {
              const lower = (u.pathname + " " + (u.search || "")).toLowerCase();
              if (limits.keywords.some((k) => lower.includes(k))) candidates.push(href);
            }
          }
        } catch {}
      }
      for (const c of candidates) {
        if (visited.size >= limits.maxPages) break;
        await collect(c);
      }
    }
  }

  await collect(websiteUrl);
  return pages;
}
