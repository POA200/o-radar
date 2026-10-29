import { collectPages, type ResearchMode } from "./research-collector";
import { z } from "zod";

export type AuthUser = { id: string };

export type CoordinatorDeps = {
  findLead: (id: string, userId: string) => Promise<any>;
  collectPages: (url: string, mode: ResearchMode, fetcher?: any) => Promise<any[]>;
  fetchMarket: (chain: string | null, contract: string | null) => Promise<any>;
  analyze: (evidence: string, mode: ResearchMode) => Promise<any>;
  persist: (data: any) => Promise<any>;
  fetcher?: any;
};

const researchAiSchema = z.object({
  summary: z.string().max(2000).nullable().optional(),
  findings: z.record(z.any()).optional(),
  sources: z.array(z.object({ url: z.string().max(500), retrievedAt: z.string().max(100).optional() })).max(50).optional(),
  confidence: z.number().int().min(0).max(100).nullable().optional(),
}).strict();

export async function runResearchCoordinator(params: { user: AuthUser | null; leadId: string; mode: ResearchMode; deps: CoordinatorDeps }) {
  const { user, leadId, mode, deps } = params;
  if (!user || !user.id) throw new Error("Unauthenticated");
  const lead = await deps.findLead(leadId, user.id);
  if (!lead) throw new Error("Lead not found");

  const pages = await deps.collectPages(lead.websiteUrl || "", mode, deps.fetcher);
  const market = await deps.fetchMarket(lead.chain, lead.contractAddress).catch(() => null);

  const evidence = pages.map((p: any) => p.text).join("\n").slice(0, mode === "DEEP" ? 12000 : 4000);
  let ai = null;
  const started = Date.now();
  try {
    ai = await deps.analyze(evidence, mode);
  } catch (e) {
    console.error("[research] AI request failed", { mode, elapsedMs: Date.now() - started, error: e instanceof Error ? e.message : String(e) });
    ai = null;
  }

  const validated = researchAiSchema.safeParse(ai);
  const parsed = validated.success ? validated.data : null;
  const status = parsed ? "COMPLETED" : "FAILED";

  const report = await deps.persist({
    leadId: lead.id,
    userId: user.id,
    mode,
    status,
    summary: parsed?.summary ?? null,
    findings: parsed?.findings ?? null,
    sources: parsed?.sources ?? pages.map((p: any) => ({ url: p.url, retrievedAt: new Date().toISOString() })),
    confidence: typeof parsed?.confidence === "number" ? parsed.confidence : null,
  });

  return report;
}
