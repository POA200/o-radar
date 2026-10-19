export function normalizeChain(chain: string | null): string | null {
  if (!chain) return null;
  const c = chain.trim().toLowerCase();
  const alias: Record<string, string> = {
    "bnb": "bsc",
    "bnb smart chain": "bsc",
    "binance": "bsc",
    "ethereum": "ethereum",
    "eth": "ethereum",
    "matic": "polygon",
    "polygon": "polygon",
    "avax": "avalanche",
    "avalanche": "avalanche",
    "sol": "solana",
    "solana": "solana",
    "arb": "arbitrum",
    "arbitrum": "arbitrum",
    "op": "optimism",
    "optimism": "optimism",
    "base": "base",
  };
  return alias[c] ?? c;
}

export function normalizeAddress(addr: string | null): string | null {
  if (!addr) return null;
  const t = addr.trim();
  if (t.startsWith("0x")) return t.toLowerCase();
  return t;
}

export function leadKey(chain: string | null, addr: string | null): string {
  return `${normalizeChain(chain) ?? ""}|${normalizeAddress(addr) ?? ""}`.toLowerCase();
}

