import { buildOutreachDraft } from "./lead-crm";

export type OutreachEvidence = {
  type: "listing" | "lead";
  projectName?: string | null;
  opportunityTitle?: string | null;
  tokenSymbol?: string | null;
  chain?: string | null;
  websiteUrl?: string | null;
  xUrl?: string | null;
  telegramUrl?: string | null;
  discordUrl?: string | null;
  contractAddress?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  whyInteresting?: string | null;
  opportunityDescription?: string | null;
  opportunityEvidence?: string | null;
  userNiche?: string | null;
  userSkills?: string[] | null;
  userPortfolio?: string | null;
  userGithub?: string | null;
  userCv?: string | null;
};

function stripSignoff(s: string): string {
  if (!s) return s;
  let out = s.replace(/\n\s*Best,?\s*\n\s*\[Your Name\]\s*$/i, "").replace(/\n\s*Best,?\s*$/i, "").replace(/\[Your Name\]\s*$/i, "");
  return out.trim();
}

function buildEvidenceBlock(e: OutreachEvidence) {
  const lines: string[] = [];
  lines.push(`Type: ${e.type}`);
  if (e.projectName) lines.push(`Project: ${e.projectName}`);
  if (e.opportunityTitle) lines.push(`Opportunity: ${e.opportunityTitle}`);
  if (e.tokenSymbol) lines.push(`Token: ${e.tokenSymbol}`);
  if (e.chain) lines.push(`Chain: ${e.chain}`);
  if (e.contractAddress) lines.push(`Contract: ${e.contractAddress}`);
  if (e.websiteUrl) lines.push(`Website: ${e.websiteUrl}`);
  if (e.xUrl) lines.push(`X: ${e.xUrl}`);
  if (e.telegramUrl) lines.push(`Telegram: ${e.telegramUrl}`);
  if (e.discordUrl) lines.push(`Discord: ${e.discordUrl}`);
  if (e.source) lines.push(`Source: ${e.source}`);
  if (e.sourceUrl) lines.push(`Source URL: ${e.sourceUrl}`);
  if (e.whyInteresting) lines.push(`Why interesting (user): ${e.whyInteresting}`);
  if (e.opportunityDescription) lines.push(`Opportunity description: ${e.opportunityDescription}`);
  if (e.opportunityEvidence) lines.push(`Evidence: ${e.opportunityEvidence}`);
  if (e.notes) lines.push(`Research notes: ${e.notes}`);
  if (e.userNiche) lines.push(`User niche: ${e.userNiche}`);
  if (e.userSkills && e.userSkills.length) lines.push(`User skills: ${e.userSkills.join(", ")}`);
  if (e.userPortfolio) lines.push(`User portfolio: ${e.userPortfolio}`);
  if (e.userGithub) lines.push(`User GitHub: ${e.userGithub}`);
  if (e.userCv && e.userCv.trim().length > 0) lines.push(`User CV summary available: yes`);
  return lines.filter((l) => !l.endsWith(": ")).join("\n");
}

export function hasAiConfig() {
  return !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.KILO_API_KEY
  );
}

export function generateOutreachFallback(e: OutreachEvidence): { normal: string; cold: string } {
  if (e.type === "listing") {
    const name = e.projectName || e.opportunityTitle || "your project";
    const tokenPart = e.tokenSymbol ? ` (${e.tokenSymbol}${e.chain ? ` on ${e.chain}` : ""})` : e.chain ? ` on ${e.chain}` : "";
    const websitePart = e.websiteUrl ? ` I came across ${e.websiteUrl}.` : "";
    const reasonPart = e.whyInteresting ? ` ${e.whyInteresting}` : e.notes ? ` ${String(e.notes).slice(0, 200)}` : "";
    const normal = `Hi ${name} team,

I noticed ${name}${tokenPart}.${websitePart}${reasonPart} I'd be happy to help with CEX listing research, preparation, and coordination where it makes sense. If you're exploring listing opportunities, I'd be glad to discuss a practical approach based on your goals.`;

    const cold = `Hi ${name} team — noticed ${name}${tokenPart}. If you're considering a CEX listing, I can help with research and coordination. Open to a quick chat?`;

    return { normal: stripSignoff(normal), cold: stripSignoff(cold) };
  }

  const base = buildOutreachDraft({
    projectName: e.projectName ?? e.opportunityTitle,
    opportunityTitle: e.opportunityTitle,
    tokenSymbol: e.tokenSymbol,
    chain: e.chain,
    websiteUrl: e.websiteUrl,
    whyInteresting: e.whyInteresting ?? e.notes,
  });

  const normal = base.replace(
    "I'd be happy to help with design, frontend development, or product work tailored to your goals. If there's anything you're looking to ship or improve right now, I'd love to chat.",
    "Based on the opportunity, I'd be happy to help with relevant work tailored to your goals. If there's anything you're looking to ship or improve right now, I'd love to chat."
  );

  const cold = `Hi ${e.projectName ?? e.opportunityTitle ?? "there"} team,

I came across your opportunity and thought there might be a good fit. I'd be happy to discuss how I can help if it's still open.`;

  return { normal: stripSignoff(normal), cold: stripSignoff(cold) };
}

export async function generateOutreachAi(e: OutreachEvidence): Promise<{ normal: string; cold: string; usedAi: boolean; error?: string }> {
  if (!hasAiConfig()) {
    return { ...generateOutreachFallback(e), usedAi: false, error: "No AI provider configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, or KILO_API_KEY." };
  }

  const evidence = buildEvidenceBlock(e);
  const system = e.type === "listing"
    ? `You are an expert CEX/token listing outreach writer. Generate TWO distinct pitches for a token project.

Rules:
- Use ONLY the supplied evidence. Do not invent exchange relationships, guaranteed listings, partnerships, audits, contacts, trading metrics, or project achievements.
- Focus on offering listing research, preparation, and coordination support. Do NOT mention applying for jobs, web development, graphic design, portfolios, or hiring.
- Never claim guaranteed outcomes.
- Be cautious if information is missing.
- Do not copy-paste the same text twice. They must be genuinely different.
- Keep messages concise and professional. Avoid spammy language.
- Do NOT add any sign-off like "Best," or "[Your Name]". End naturally.
- Return JSON with keys "normal" and "cold".`
    : `You are an expert Web3 outreach writer. Generate TWO distinct pitches for the same prospect.

Rules:
- Use ONLY the supplied evidence. Do not invent project needs, funding, trading metrics, contacts, partnerships, exchange relationships, or other facts.
- Distinguish verified facts from reasonable observations. If information is missing, be cautious rather than fabricating.
- Never claim "we can get you listed" or guarantee exchange outcomes.
- Tailor to the prospect's type: if type=lead (opportunity), focus on fit to the opportunity without assuming it's a token listing.
- Do not copy-paste the same text twice. They must be genuinely different.
- Keep messages concise and professional. Avoid spammy language.
- Do NOT add any sign-off like "Best," or "[Your Name]". End naturally.
- Return JSON with keys "normal" and "cold".`;

  const user = e.type === "listing"
    ? `Generate two CEX listing outreach pitches.

Evidence:
${evidence}

Pitch 1 - "normal": Professional, personalized message offering CEX listing research/support/coordination. Reference specific details from evidence where they exist.
Pitch 2 - "cold": Shorter, direct first-contact message suitable for X or Telegram DM. Different tone/structure from normal. Do not add sign-off.`
    : `Generate two pitches.

Evidence:
${evidence}

Pitch 1 - "normal": Professional, personalized approach suitable for an established contact or warmer introduction. Reference specific details from evidence where they exist.
Pitch 2 - "cold": Concise, compelling first-contact message for someone not contacted before. Different tone/structure from normal. Do not add sign-off.`;

  try {
    if (process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY) {
      const usingOpenRouter = !!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY;
      const key = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
      const baseUrl = usingOpenRouter ? "https://openrouter.ai/api/v1" : (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1");
      const model = usingOpenRouter ? (process.env.OPENROUTER_MODEL || "google/gemma-3n-e4b-it:free") : (process.env.OPENAI_MODEL || "gpt-4o-mini");
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          ...(usingOpenRouter ? { "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", "X-Title": "O-Radar" } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.4,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content || "{}";
        try {
          let parsed: any;
          try { parsed = JSON.parse(content); } catch { const match = content.match(/\{[\s\S]*\}/); if (match) parsed = JSON.parse(match[0]); }
          if (parsed && parsed.normal && parsed.cold && parsed.normal !== parsed.cold) {
            return { normal: stripSignoff(parsed.normal), cold: stripSignoff(parsed.cold), usedAi: true };
          }
        } catch {}
      }
    }
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-13" },
          body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest", max_tokens: 800, system, messages: [{ role: "user", content: user + "\n\nReturn JSON with keys normal and cold." }] }),
        });
        if (res.ok) {
          const data = await res.json();
          const content = data?.content?.[0]?.text || "{}";
          try {
            let parsed: any;
            try { parsed = JSON.parse(content); } catch { const match = content.match(/\{[\s\S]*\}/); if (match) parsed = JSON.parse(match[0]); }
            if (parsed && parsed.normal && parsed.cold && parsed.normal !== parsed.cold) {
              return { normal: stripSignoff(parsed.normal), cold: stripSignoff(parsed.cold), usedAi: true };
            }
          } catch {}
        }
      } catch {}
    }
    if (process.env.GEMINI_API_KEY) {
      try {
        const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: system + "\n\n" + user + "\n\nReturn JSON with keys normal and cold." }] }], generationConfig: { temperature: 0.4, responseMimeType: "application/json" } }),
        });
        if (res.ok) {
          const data = await res.json();
          const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          try {
            const parsed = JSON.parse(content);
            if (parsed && parsed.normal && parsed.cold && parsed.normal !== parsed.cold) {
              return { normal: stripSignoff(parsed.normal), cold: stripSignoff(parsed.cold), usedAi: true };
            }
          } catch {}
        }
      } catch {}
    }
  } catch (e) {
    // fall through
  }

  return { ...generateOutreachFallback(e), usedAi: false, error: "AI generation failed or returned invalid output. Used fallback templates." };
}
