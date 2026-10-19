"use server";

import { prisma } from "@o-radar/db";
import { revalidatePath } from "next/cache";
import { requireOnboardedUser } from "../../src/require-user";
import { z } from "zod";

const listingLeadSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  tokenSymbol: z.string().optional().nullable(),
  chain: z.string().optional().nullable(),
  contractAddress: z.string().optional().nullable(),
  websiteUrl: z.string().url().optional().or(z.literal("")).nullable(),
  xUrl: z.string().url().optional().or(z.literal("")).nullable(),
  telegramUrl: z.string().url().optional().or(z.literal("")).nullable(),
  discordUrl: z.string().url().optional().or(z.literal("")).nullable(),
  discoverySource: z
    .enum(["DEX_SCREENER", "GECKO_TERMINAL", "COIN_GECKO", "COIN_MARKET_CAP", "LAUNCHPAD", "MANUAL", "OTHER"])
    .default("MANUAL"),
  sourceUrl: z.string().url().optional().or(z.literal("")).nullable(),
  volume24hUsd: z.coerce.number().nonnegative().optional().nullable(),
  holderCount: z.coerce.number().int().nonnegative().optional().nullable(),
  listingStatus: z
    .enum([
      "DISCOVERED",
      "RESEARCHING",
      "QUALIFIED",
      "CONTACTED",
      "REPLIED",
      "IN_PROGRESS",
      "WON",
      "LOST",
      "CONVERTED",
      "ARCHIVED",
    ])
    .default("DISCOVERED"),
  priority: z.coerce.number().int().default(0),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().or(z.literal("")).nullable(),
  contactTelegram: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lastContactedAt: z.string().optional().nullable(),
  nextFollowUpAt: z.string().optional().nullable(),
});

export type ListingLeadInput = z.infer<typeof listingLeadSchema>;

export async function createListingLead(input: ListingLeadInput) {
  await requireOnboardedUser();
  const data = listingLeadSchema.parse(input);
  const created = await prisma.listingLead.create({
    data: {
      projectName: data.projectName,
      tokenSymbol: data.tokenSymbol || null,
      chain: data.chain || null,
      contractAddress: data.contractAddress || null,
      websiteUrl: data.websiteUrl || null,
      xUrl: data.xUrl || null,
      telegramUrl: data.telegramUrl || null,
      discordUrl: data.discordUrl || null,
      discoverySource: data.discoverySource,
      sourceUrl: data.sourceUrl || null,
      volume24hUsd: data.volume24hUsd ?? null,
      holderCount: data.holderCount ?? null,
      listingStatus: data.listingStatus,
      priority: data.priority,
      contactName: data.contactName || null,
      contactEmail: data.contactEmail || null,
      contactTelegram: data.contactTelegram || null,
      notes: data.notes || null,
      lastContactedAt: data.lastContactedAt ? new Date(data.lastContactedAt) : null,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
    },
  });
  revalidatePath("/listing-leads");
  return created;
}

export async function updateListingLead(id: string, input: ListingLeadInput) {
  await requireOnboardedUser();
  const data = listingLeadSchema.parse(input);
  const updated = await prisma.listingLead.update({
    where: { id },
    data: {
      projectName: data.projectName,
      tokenSymbol: data.tokenSymbol || null,
      chain: data.chain || null,
      contractAddress: data.contractAddress || null,
      websiteUrl: data.websiteUrl || null,
      xUrl: data.xUrl || null,
      telegramUrl: data.telegramUrl || null,
      discordUrl: data.discordUrl || null,
      discoverySource: data.discoverySource,
      sourceUrl: data.sourceUrl || null,
      volume24hUsd: data.volume24hUsd ?? null,
      holderCount: data.holderCount ?? null,
      listingStatus: data.listingStatus,
      priority: data.priority,
      contactName: data.contactName || null,
      contactEmail: data.contactEmail || null,
      contactTelegram: data.contactTelegram || null,
      notes: data.notes || null,
      lastContactedAt: data.lastContactedAt ? new Date(data.lastContactedAt) : null,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
    },
  });
  revalidatePath("/listing-leads");
  return updated;
}

export async function deleteListingLead(id: string) {
  await requireOnboardedUser();
  await prisma.listingLead.delete({ where: { id } });
  revalidatePath("/listing-leads");
}

// ===== DEX Screener discovery =====

export type DexScreenerResult = {
  chain: string | null;
  tokenAddress: string | null;
  projectName: string;
  tokenSymbol: string | null;
  websiteUrl: string | null;
  xUrl: string | null;
  telegramUrl: string | null;
  discordUrl: string | null;
  sourceUrl: string | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  marketCap: number | null;
  marketCapSource: "marketCap" | "fdv" | null;
  priceUsd: string | null;
  description: string | null;
};

const DEX_API = "https://api.dexscreener.com";
const TIMEOUT_MS = 12000;

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`DEX Screener request failed: ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function linkUrl(links: unknown, typeOrLabel: string): string | null {
  if (!Array.isArray(links)) return null;
  for (const l of links) {
    const r = asRecord(l);
    if (!r) continue;
    const t = String(r.type ?? r.label ?? "").toLowerCase();
    if (t.includes(typeOrLabel.toLowerCase())) {
      const u = str(r.url);
      if (u) return u;
    }
  }
  if (typeOrLabel === "website") {
    for (const l of links) {
      const r = asRecord(l);
      if (!r) continue;
      const u = str(r.url);
      if (u) return u;
    }
  }
  return null;
}

export async function discoverDexScreener(params: {
  source: "profiles" | "search";
  query?: string;
  chain?: string;
  minVolume?: number;
  minLiquidity?: number;
}): Promise<DexScreenerResult[]> {
  await requireOnboardedUser();

  const results: DexScreenerResult[] = [];
  const seen = new Set<string>();

  const add = (r: DexScreenerResult) => {
    const key = `${r.chain ?? ""}|${r.tokenAddress ?? ""}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    if (params.minVolume != null && (r.volume24hUsd ?? 0) < params.minVolume) return;
    if (params.minLiquidity != null && (r.liquidityUsd ?? 0) < params.minLiquidity) return;
    if (params.chain && params.chain !== "all" && r.chain !== params.chain) return;
    results.push(r);
  };

  if (params.source === "profiles") {
    const data = await fetchJson(`${DEX_API}/token-profiles/latest/v1`);
    const arr = Array.isArray(data) ? data : [];
    const profiles = arr.slice(0, 60).map((item) => asRecord(item)).filter((r): r is Record<string, unknown> => r !== null);

    // Group token addresses by chain to batch pair lookups (max 30 per request).
    const byChain = new Map<string, string[]>();
    const profileLinks = new Map<string, unknown>();
    for (const r of profiles) {
      const chain = str(r.chainId);
      const addr = str(r.tokenAddress);
      if (!chain || !addr) continue;
      if (!byChain.has(chain)) byChain.set(chain, []);
      byChain.get(chain)!.push(addr);
      profileLinks.set(`${chain}|${addr.toLowerCase()}`, r.links);
      // profile url fallback
      profileLinks.set(`${chain}|${addr.toLowerCase()}_url`, r.url);
    }

    // Fetch pairs per chain in batches of 30.
    const pairsByToken = new Map<string, Record<string, unknown>[]>();
    for (const [chain, addrs] of byChain) {
      for (let i = 0; i < addrs.length; i += 30) {
        const batch = addrs.slice(i, i + 30);
        const url = `${DEX_API}/tokens/v1/${encodeURIComponent(chain)}/${batch.join(",")}`;
        let pairs: unknown = [];
        try {
          pairs = await fetchJson(url);
        } catch {
          pairs = [];
        }
        const arr2 = Array.isArray(pairs) ? pairs : [];
        for (const p of arr2) {
          const rec = asRecord(p);
          if (!rec) continue;
          const base = asRecord(rec.baseToken);
          const quote = asRecord(rec.quoteToken);
          for (const tok of [base, quote]) {
            const addr = str(tok?.address);
            if (!addr) continue;
            const key = `${chain}|${addr.toLowerCase()}`;
            if (!pairsByToken.has(key)) pairsByToken.set(key, []);
            pairsByToken.get(key)!.push(rec);
          }
        }
      }
    }

    for (const r of profiles) {
      const chain = str(r.chainId);
      const addr = str(r.tokenAddress);
      if (!chain || !addr) continue;
      const key = `${chain}|${addr.toLowerCase()}`;
      const candidates = pairsByToken.get(key) ?? [];
      // pick best representative: highest liquidity, then 24h volume
      let best: Record<string, unknown> | null = null;
      for (const c of candidates) {
        if (!best) { best = c; continue; }
        const lBest = num(asRecord(best.liquidity)?.usd) ?? 0;
        const lCur = num(asRecord(c.liquidity)?.usd) ?? 0;
        if (lCur > lBest) { best = c; continue; }
        if (lCur === lBest) {
          const vBest = num(asRecord(best.volume)?.h24) ?? 0;
          const vCur = num(asRecord(c.volume)?.h24) ?? 0;
          if (vCur > vBest) best = c;
        }
      }

      const base = asRecord(best?.baseToken);
      const quote = asRecord(best?.quoteToken);
      const matched = base && str(base.address)?.toLowerCase() === addr.toLowerCase() ? base : (quote && str(quote.address)?.toLowerCase() === addr.toLowerCase() ? quote : base);
      const liq = asRecord(best?.liquidity);
      const vol = asRecord(best?.volume);
      const info = asRecord(best?.info);
      const websites = Array.isArray(info?.websites) ? info.websites : [];
      const socials = Array.isArray(info?.socials) ? info.socials : [];
      const siteUrl = websites.length ? str(asRecord(websites[0])?.url) : linkUrl(r.links, "website");
      const xSocial = socials.find((s) => {
        const rr = asRecord(s);
        const platform = String(rr?.platform ?? "").toLowerCase();
        return platform.includes("twitter") || platform.includes("x");
      });
      const tgSocial = socials.find((s) => String(asRecord(s)?.platform ?? "").toLowerCase().includes("telegram"));
      const dcSocial = socials.find((s) => String(asRecord(s)?.platform ?? "").toLowerCase().includes("discord"));

      const name = str(matched?.name) ?? str(matched?.symbol) ?? null;
      const symbol = str(matched?.symbol);
      add({
        chain,
        tokenAddress: addr,
        projectName: name ?? "Unknown token",
        tokenSymbol: symbol,
        websiteUrl: siteUrl ?? linkUrl(r.links, "website"),
        xUrl: str(asRecord(xSocial)?.url) ?? linkUrl(r.links, "twitter"),
        telegramUrl: str(asRecord(tgSocial)?.url) ?? linkUrl(r.links, "telegram"),
        discordUrl: str(asRecord(dcSocial)?.url) ?? linkUrl(r.links, "discord"),
        sourceUrl: str(best?.url) ?? str(r.url),
        volume24hUsd: num(vol?.h24),
        liquidityUsd: num(liq?.usd),
        marketCap: num(best?.marketCap) ?? num(best?.fdv),
        marketCapSource: num(best?.marketCap) != null ? "marketCap" : (num(best?.fdv) != null ? "fdv" : null),
        priceUsd: str(best?.priceUsd),
        description: str(r.description),
      });
    }
  } else {
    const q = (params.query ?? "").trim();
    if (!q) throw new Error("Search query is required");
    const data = await fetchJson(`${DEX_API}/latest/dex/search?q=${encodeURIComponent(q)}`);
    const obj = asRecord(data);
    const pairs = Array.isArray(obj?.pairs) ? obj.pairs : [];

    // Group pairs by chain+baseToken address, pick best representative (liquidity then volume).
    const grouped = new Map<string, Record<string, unknown>[]>();
    for (const p of pairs) {
      const r = asRecord(p);
      if (!r) continue;
      const base = asRecord(r.baseToken);
      const addr = str(base?.address);
      const chain = str(r.chainId);
      if (!addr || !chain) continue;
      const key = `${chain}|${addr.toLowerCase()}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    for (const [, cands] of grouped) {
      let best = cands[0];
      if (!best) continue;
      for (const c of cands.slice(1)) {
        const lBest = num(asRecord(best.liquidity)?.usd) ?? 0;
        const lCur = num(asRecord(c.liquidity)?.usd) ?? 0;
        if (lCur > lBest || (lCur === lBest && (num(asRecord(c.volume)?.h24) ?? 0) > (num(asRecord(best.volume)?.h24) ?? 0))) {
          best = c;
        }
      }
      const r = best;
      const base = asRecord(r.baseToken);
      const quote = asRecord(r.quoteToken);
      // Identify which token the search represents. If the query is an address,
      // match the side whose address equals it; otherwise default to baseToken.
      const qLower = q.toLowerCase();
      let matched = base;
      if (qLower && (str(base?.address)?.toLowerCase() === qLower || str(quote?.address)?.toLowerCase() === qLower)) {
        matched = str(base?.address)?.toLowerCase() === qLower ? base : quote;
      }
      const liq = asRecord(r.liquidity);
      const vol = asRecord(r.volume);
      const info = asRecord(r.info);
      const websites = Array.isArray(info?.websites) ? info.websites : [];
      const socials = Array.isArray(info?.socials) ? info.socials : [];
      const siteUrl = websites.length ? str(asRecord(websites[0])?.url) : null;
      const xSocial = socials.find((s) => {
        const rr = asRecord(s);
        const platform = String(rr?.platform ?? "").toLowerCase();
        return platform.includes("twitter") || platform.includes("x");
      });
      const tgSocial = socials.find((s) => String(asRecord(s)?.platform ?? "").toLowerCase().includes("telegram"));
      const dcSocial = socials.find((s) => String(asRecord(s)?.platform ?? "").toLowerCase().includes("discord"));
      const name = str(matched?.name) ?? str(matched?.symbol);
      add({
        chain: str(r.chainId),
        tokenAddress: str(matched?.address),
        projectName: name ?? "Unknown token",
        tokenSymbol: str(matched?.symbol),
        websiteUrl: siteUrl,
        xUrl: str(asRecord(xSocial)?.url),
        telegramUrl: str(asRecord(tgSocial)?.url),
        discordUrl: str(asRecord(dcSocial)?.url),
        sourceUrl: str(r.url),
        volume24hUsd: num(vol?.h24),
        liquidityUsd: num(liq?.usd),
        marketCap: num(r.marketCap) ?? num(r.fdv),
        marketCapSource: num(r.marketCap) != null ? "marketCap" : (num(r.fdv) != null ? "fdv" : null),
        priceUsd: str(r.priceUsd),
        description: null,
      });
    }
  }

  return results.slice(0, 50);
}

// ===== GeckoTerminal discovery =====

const GECKO_API = "https://api.geckoterminal.com/api/v2";
const GECKO_TIMEOUT_MS = 12000;

const QUOTE_SYMBOLS = new Set([
  "USDC", "USDT", "USDT0", "DAI", "BUSD", "FDUSD", "TUSD", "USDD", "FRAX",
  "WETH", "WBTC", "WBNB", "WSOL", "WMATIC", "WAVAX", "WFTM",
  "ETH", "BTC", "BNB", "SOL", "MATIC", "AVAX", "FTM", "TRX",
]);

async function fetchGeckoJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GECKO_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (res.status === 429) throw new Error("GeckoTerminal rate limit exceeded (HTTP 429). Please retry later.");
    if (!res.ok) throw new Error(`GeckoTerminal request failed: ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverGeckoTerminal(params: {
  source: "new_pools" | "search";
  query?: string;
  network?: string;
  minVolume?: number;
  minLiquidity?: number;
}): Promise<DexScreenerResult[]> {
  await requireOnboardedUser();

  const results: DexScreenerResult[] = [];
  const seen = new Set<string>();

  const add = (r: DexScreenerResult) => {
    const key = `${r.chain ?? ""}|${r.tokenAddress ?? ""}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    if (params.minVolume != null && (r.volume24hUsd ?? 0) < params.minVolume) return;
    if (params.minLiquidity != null && (r.liquidityUsd ?? 0) < params.minLiquidity) return;
    if (params.network && params.network !== "all" && r.chain !== params.network) return;
    results.push(r);
  };

  const includeMap = (included: unknown[]): Map<string, Record<string, unknown>> => {
    const m = new Map<string, Record<string, unknown>>();
    for (const it of included) {
      const r = asRecord(it);
      if (!r) continue;
      const id = str(r.id);
      const type = str(r.type);
      if (id && type) m.set(`${type}:${id}`, r);
    }
    return m;
  };

  const resolveToken = (rel: unknown, included: Map<string, Record<string, unknown>>): Record<string, unknown> | null => {
    const d = asRecord(asRecord(rel)?.data);
    if (!d) return null;
    const id = str(d.id);
    const type = str(d.type) ?? "token";
    if (!id) return null;
    return included.get(`${type}:${id}`) ?? null;
  };

  const parsePool = (pool: Record<string, unknown>, included: Map<string, Record<string, unknown>>): DexScreenerResult | null => {
    const attrs = asRecord(pool.attributes);
    if (!attrs) return null;
    const rels = asRecord(pool.relationships);
    const baseToken = resolveToken(rels?.base_token, included);
    const quoteToken = resolveToken(rels?.quote_token, included);
    const dexRel = resolveToken(rels?.dex, included);
    const netRel = resolveToken(rels?.network, included);

    const baseAttrs = asRecord(baseToken?.attributes);
    const quoteAttrs = asRecord(quoteToken?.attributes);
    const baseSymbol = str(baseAttrs?.symbol);
    const quoteSymbol = str(quoteAttrs?.symbol);

    // Identify project token: prefer non-quote (stable/wrapped/native) side.
    let projectToken = baseToken;
    let projectAttrs = baseAttrs;
    const baseIsQuote = baseSymbol ? QUOTE_SYMBOLS.has(baseSymbol.toUpperCase()) : false;
    const quoteIsQuote = quoteSymbol ? QUOTE_SYMBOLS.has(quoteSymbol.toUpperCase()) : false;
    if (baseIsQuote && !quoteIsQuote) {
      projectToken = quoteToken;
      projectAttrs = quoteAttrs;
    }

    const netId = str(netRel?.id) ?? str(asRecord(asRecord(rels?.network)?.data)?.id);

    const tokenAddress = str(projectAttrs?.address);
    if (!tokenAddress) {
      // fallback: cannot resolve token; skip rather than use pool address
      return null;
    }

    const poolAddress = str(attrs.address);
    const dexName = str(asRecord(dexRel?.attributes)?.name) ?? str(dexRel?.id);
    const name = str(projectAttrs?.name) ?? str(projectAttrs?.symbol) ?? "Unknown token";
    const symbol = str(projectAttrs?.symbol);
    const vol24 = num(attrs.volume_usd && asRecord(attrs.volume_usd)?.h24 ? Number(asRecord(attrs.volume_usd)?.h24) : null);
    const liquidity = num(attrs.reserve_in_usd ? Number(attrs.reserve_in_usd) : null);
    const marketCap = num(attrs.market_cap_usd ? Number(attrs.market_cap_usd) : null);
    const fdv = num(attrs.fdv_usd ? Number(attrs.fdv_usd) : null);
    const price = str(attrs.base_token_price_usd);
    const createdAt = str(attrs.pool_created_at);
    const poolUrl = netId && poolAddress ? `https://www.geckoterminal.com/${netId}/pools/${poolAddress}` : null;

    return {
      chain: netId,
      tokenAddress,
      projectName: name,
      tokenSymbol: symbol,
      websiteUrl: null,
      xUrl: null,
      telegramUrl: null,
      discordUrl: null,
      sourceUrl: poolUrl,
      volume24hUsd: vol24,
      liquidityUsd: liquidity,
      marketCap: marketCap ?? fdv,
      marketCapSource: marketCap != null ? "marketCap" : (fdv != null ? "fdv" : null),
      priceUsd: price,
      description: dexName ? `DEX: ${dexName}${createdAt ? ` · Pool created ${createdAt}` : ""}` : (createdAt ? `Pool created ${createdAt}` : null),
    };
  };

  const collectPools = async (url: string): Promise<Record<string, unknown>[]> => {
    const data = await fetchGeckoJson(url);
    const obj = asRecord(data);
    const arr = Array.isArray(obj?.data) ? obj.data : [];
    const included = Array.isArray(obj?.included) ? obj.included : [];
    const incMap = includeMap(included);
    const pools: Record<string, unknown>[] = [];
    for (const p of arr) {
      const rec = asRecord(p);
      if (!rec) continue;
      const parsed = parsePool(rec, incMap);
      if (parsed) pools.push({ _parsed: parsed });
    }
    // dedup by chain+tokenAddress, liquidity then volume
    const grouped = new Map<string, DexScreenerResult[]>();
    for (const w of pools) {
      const r = w._parsed as DexScreenerResult;
      const key = `${r.chain ?? ""}|${r.tokenAddress ?? ""}`.toLowerCase();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }
    for (const [, cands] of grouped) {
      let best = cands[0];
      if (!best) continue;
      for (const c of cands.slice(1)) {
        const lBest = best.liquidityUsd ?? 0;
        const lCur = c.liquidityUsd ?? 0;
        if (lCur > lBest || (lCur === lBest && (c.volume24hUsd ?? 0) > (best.volume24hUsd ?? 0))) {
          best = c;
        }
      }
      if (best) add(best);
    }
    return pools;
  };

  if (params.source === "new_pools") {
    const net = params.network && params.network !== "all" ? params.network : null;
    const path = net ? `/networks/${encodeURIComponent(net)}/new_pools` : `/networks/new_pools`;
    const url = `${GECKO_API}${path}?include=base_token,quote_token,dex&page=1`;
    await collectPools(url);
  } else {
    const q = (params.query ?? "").trim();
    if (!q) throw new Error("Search query is required");
    const net = params.network && params.network !== "all" ? params.network : null;
    let url = `${GECKO_API}/search/pools?query=${encodeURIComponent(q)}&include=base_token,quote_token,dex&page=1`;
    await collectPools(url);
    // network filter applied in add() via params.network
  }

  return results.slice(0, 50);
}
