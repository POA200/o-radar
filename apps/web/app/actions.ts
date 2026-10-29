"use server";

import { prisma } from "@o-radar/db";
import { GitHubScraper } from "@o-radar/db/scrapers/github";
import { RssScraper } from "@o-radar/db/scrapers/rss";
import { recordSourceHealth } from "@o-radar/db/scrapers/source-adapter";
import { revalidatePath } from "next/cache";
import { requireOnboardedUser } from "../src/require-user";
import { signOut } from "../auth";
import { z } from "zod";

type LeadStatus = "DISCOVERED" | "RESEARCHING" | "QUALIFIED" | "READY_TO_CONTACT" | "CONTACTED" | "REPLIED" | "APPLIED" | "IN_PROGRESS" | "WON" | "LOST" | "CONVERTED" | "ARCHIVED";

export type HuntSource = "github" | "rss" | "all";

export async function runDiscovery(source: HuntSource = "all") {
  await requireOnboardedUser();
  const results = {
    github: null as Awaited<ReturnType<GitHubScraper["run"]>> | null,
    rss: null as Awaited<ReturnType<RssScraper["run"]>> | null,
  };

  const jobs = [
    ...(source === "github" || source === "all"
      ? [
          new GitHubScraper().run(10).then(async (result) => {
            results.github = result;
            await recordSourceHealth(prisma, "GITHUB_ISSUE", {
              fetched: result.fetched,
              created: result.discovered,
              updated: result.updated,
              skipped: result.skipped,
              failed: result.failed,
            });
          }).catch(async (error) => {
            await recordSourceHealth(prisma, "GITHUB_ISSUE", {
              fetched: 0,
              created: 0,
              updated: 0,
              skipped: 0,
              failed: 1,
            }, error);
          }),
        ]
      : []),
    ...(source === "rss" || source === "all"
      ? [
          new RssScraper().run().then(async (result) => {
            results.rss = result;
            await recordSourceHealth(prisma, "RSS_FEED", {
              fetched: result.fetched,
              created: result.discovered,
              updated: result.updated,
              skipped: result.skipped,
              failed: result.failed,
            });
          }).catch(async (error) => {
            await recordSourceHealth(prisma, "RSS_FEED", {
              fetched: 0,
              created: 0,
              updated: 0,
              skipped: 0,
              failed: 1,
            }, error);
          }),
        ]
      : []),
  ];

  await Promise.allSettled(jobs);

  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/leads");
  revalidatePath("/saved");
  return results;
}

async function getAuthorAndPlatform(opportunityId: string) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: { evidences: { orderBy: { capturedAt: "desc" }, take: 1 } },
  });

  const platform = opportunity?.source === "RSS_FEED" ? "RSS" : "GITHUB";
  const evidence = opportunity?.evidences[0];
  const rawPayload = evidence?.rawPayload;

  if (rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)) {
    const author = (rawPayload as { author?: unknown }).author;

    if (author && typeof author === "object" && !Array.isArray(author)) {
      const handle = (author as { handle?: unknown }).handle;
      const profileUrl = (author as { profileUrl?: unknown }).profileUrl;

      if (typeof handle === "string") {
        return {
          platform,
          handle,
          profileUrl: typeof profileUrl === "string" ? profileUrl : undefined,
        };
      }
    } else if (typeof author === "string" && author.trim()) {
      return {
        platform,
        handle: author.trim(),
        profileUrl: undefined,
      };
    }
  }

  return {
    platform,
    handle: `opportunity-${opportunityId.slice(-8)}`,
  };
}

export async function promoteOpportunityToLead(opportunityId: string) {
  const user = await requireOnboardedUser();
  const contact = await getAuthorAndPlatform(opportunityId);
  const existingLead = await prisma.lead.findFirst({
    where: { userId: user.id, opportunityId, handle: contact.handle },
  });

  if (existingLead) {
    await prisma.lead.update({
      where: { id: existingLead.id },
      data: { status: "QUALIFIED", profileUrl: contact.profileUrl },
    });
  } else {
    await prisma.lead.create({
      data: {
        opportunityId,
        handle: contact.handle,
        platform: contact.platform,
        profileUrl: contact.profileUrl,
        status: "QUALIFIED",
        userId: user.id,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/leads");
  revalidatePath("/saved");
}

export async function archiveOpportunity(opportunityId: string) {
  const user = await requireOnboardedUser();
  const contact = await getAuthorAndPlatform(opportunityId);
  const existingLead = await prisma.lead.findFirst({
    where: { userId: user.id, opportunityId, handle: contact.handle },
  });

  if (existingLead) {
    await prisma.lead.update({ where: { id: existingLead.id }, data: { status: "ARCHIVED" } });
  } else {
    await prisma.lead.create({
      data: {
        opportunityId,
        handle: contact.handle,
        platform: contact.platform,
        profileUrl: contact.profileUrl,
        status: "ARCHIVED",
        userId: user.id,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/leads");
  revalidatePath("/saved");
}

const leadStatusSchema = z.enum(["DISCOVERED","RESEARCHING","QUALIFIED","READY_TO_CONTACT","CONTACTED","REPLIED","APPLIED","IN_PROGRESS","WON","LOST","CONVERTED","ARCHIVED"]);
export async function updateLeadStatus(leadId: string, status: LeadStatus, appliedAt?: string | null) {
  const user = await requireOnboardedUser();
  const parsedStatus = leadStatusSchema.safeParse(status);
  if (!parsedStatus.success) throw new Error("Invalid status");
  const existing = await prisma.lead.findFirst({ where: { id: leadId, userId: user.id }, select: { appliedAt: true } });
  if (!existing) throw new Error("Lead not found");
  const data: { status: LeadStatus; lastContactedAt?: Date; appliedAt?: Date | null } = { status: parsedStatus.data };
  if (status === "CONTACTED") data.lastContactedAt = new Date();
  if (appliedAt !== undefined) {
    data.appliedAt = appliedAt ? new Date(appliedAt) : null;
  } else if (status === "APPLIED" && existing.appliedAt === null) {
    data.appliedAt = new Date();
  }
  await prisma.lead.updateMany({
    where: { id: leadId, userId: user.id },
    data,
  });
  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/leads");
  revalidatePath("/saved");
}

export async function updateLeadAppliedAt(leadId: string, appliedAt: string | null) {
  const user = await requireOnboardedUser();
  await prisma.lead.updateMany({
    where: { id: leadId, userId: user.id },
    data: { appliedAt: appliedAt ? new Date(appliedAt) : null },
  });
  revalidatePath("/leads");
}

export async function updateLeadNotes(leadId: string, notes: string) {
  const user = await requireOnboardedUser();
  await prisma.lead.updateMany({
    where: { id: leadId, userId: user.id },
    data: { notes: notes.trim() || null },
  });
  revalidatePath("/leads");
  revalidatePath("/saved");
}

export async function unsaveOpportunity(opportunityId: string) {
  const user = await requireOnboardedUser();
  await prisma.lead.updateMany({
    where: { userId: user.id, opportunityId, status: { not: "ARCHIVED" } },
    data: { status: "DISCOVERED" },
  });
  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/leads");
  revalidatePath("/saved");
}

const profileSchema = z.object({
  niche: z.string().trim().min(2).max(160),
  roles: z.array(z.string()).default([]),
  chains: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  cvText: z.string().trim().max(20000).optional(),
});

export async function updateUserProfile(formData: FormData) {
  const user = await requireOnboardedUser();

  const parsed = profileSchema.parse({
    niche: formData.get("niche"),
    roles: formData.getAll("roles"),
    chains: formData.getAll("chains"),
    skills: String(formData.get("skills") ?? "")
      .split(/[,;\n]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    portfolioUrl: formData.get("portfolioUrl"),
    githubUrl: formData.get("githubUrl"),
    cvText: formData.get("cvText"),
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      niche: parsed.niche,
      targetRoles: parsed.roles,
      targetChains: parsed.chains,
      skills: parsed.skills,
      portfolioUrl: parsed.portfolioUrl || null,
      githubUrl: parsed.githubUrl || null,
      cvText: parsed.cvText || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/settings");
}

export async function handleSignOut() {
  await signOut({ redirectTo: "/signin" });
}
export async function updateLeadCrmFields(
  leadId: string,
  fields: {
    notes?: string | null;
    whyInteresting?: string | null;
    nextAction?: string | null;
    outcome?: string | null;
    priority?: number | null;
    nextFollowUpAt?: string | null;
  }
) {
  const user = await requireOnboardedUser();
  const data: any = {};
  if ("notes" in fields) data.notes = fields.notes === null || fields.notes === "" ? null : fields.notes;
  if ("whyInteresting" in fields) data.whyInteresting = fields.whyInteresting === null || fields.whyInteresting === "" ? null : fields.whyInteresting;
  if ("nextAction" in fields) data.nextAction = fields.nextAction === null || fields.nextAction === "" ? null : fields.nextAction;
  if ("outcome" in fields) data.outcome = fields.outcome === null || fields.outcome === "" ? null : fields.outcome;
  if ("priority" in fields && fields.priority !== undefined && fields.priority !== null) data.priority = Number(fields.priority);
  if ("nextFollowUpAt" in fields) data.nextFollowUpAt = fields.nextFollowUpAt ? new Date(fields.nextFollowUpAt) : null;
  await prisma.lead.updateMany({
    where: { id: leadId, userId: user.id },
    data,
  });
  revalidatePath("/leads");
  revalidatePath("/saved");
}

import { generateOutreachAi, type OutreachEvidence } from "@/lib/outreach-ai";
import { prisma as db } from "@o-radar/db";

function addDays(d: Date, days: number) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

const followUpDaysDefault = 3;

export async function generateLeadPitches(leadId: string, force = false) {
  const user = await requireOnboardedUser();
  const lead = await db.lead.findFirst({
    where: { id: leadId, userId: user.id },
    include: { opportunity: { include: { evidences: { orderBy: { capturedAt: "desc" }, take: 3 } } } },
  });
  if (!lead) throw new Error("Not found");

  if (!force && lead.outreachNormal && lead.outreachCold) {
    return { normal: lead.outreachNormal, cold: lead.outreachCold, cached: true, usedAi: false };
  }

  const evidenceParts: string[] = [];
  if ((lead.opportunity as any)?.description) evidenceParts.push((lead.opportunity as any).description);
  if ((lead.opportunity as any)?.content) evidenceParts.push((lead.opportunity as any).content);
  for (const ev of lead.opportunity?.evidences || []) {
    try {
      const p = (ev as any).rawPayload;
      if (p && typeof p === "object") {
        const s = (p as any).snippet || (p as any).body || (p as any).text;
        if (typeof s === "string") evidenceParts.push(s);
      }
    } catch {}
  }

  const evidence: OutreachEvidence = {
    type: "lead",
    opportunityTitle: lead.opportunity?.title,
    source: lead.opportunity?.source,
    sourceUrl: lead.opportunity?.url,
    opportunityDescription: (lead.opportunity as any)?.description || (lead.opportunity as any)?.content,
    opportunityEvidence: evidenceParts.join("\n\n").slice(0, 2000) || null,
    notes: lead.notes,
    whyInteresting: (lead as any).whyInteresting,
    userNiche: user.niche,
    userSkills: user.skills,
    userPortfolio: user.portfolioUrl,
    userGithub: user.githubUrl,
    userCv: user.cvText,
  };

  const res = await generateOutreachAi(evidence);
  await db.lead.update({
    where: { id: leadId },
    data: {
      outreachNormal: res.normal,
      outreachCold: res.cold,
      outreachGeneratedAt: new Date(),
    },
  });
  revalidatePath("/leads");
  revalidatePath("/saved");
  return { normal: res.normal, cold: res.cold, cached: false, usedAi: res.usedAi, error: res.error };
}

export async function saveLeadPitches(leadId: string, normal: string, cold: string) {
  const user = await requireOnboardedUser();
  await db.lead.updateMany({
    where: { id: leadId, userId: user.id },
    data: {
      outreachNormal: normal?.trim() || null,
      outreachCold: cold?.trim() || null,
    },
  });
  revalidatePath("/leads");
  revalidatePath("/saved");
  return { ok: true };
}

const leadStatusSchema2 = z.enum(["DISCOVERED","RESEARCHING","QUALIFIED","READY_TO_CONTACT","CONTACTED","REPLIED","APPLIED","IN_PROGRESS","WON","LOST","CONVERTED","ARCHIVED"]);
export async function updateLeadStatusWithAutomation(leadId: string, status: LeadStatus, appliedAt?: string | null) {
  const user = await requireOnboardedUser();
  const parsedStatus = leadStatusSchema2.safeParse(status);
  if (!parsedStatus.success) throw new Error("Invalid status");
  const existing = await db.lead.findFirst({ where: { id: leadId, userId: user.id } });
  if (!existing) throw new Error("Lead not found");

  const data: any = { status: parsedStatus.data };
  if (status === "CONTACTED") {
    data.lastContactedAt = new Date();
    if (!existing.nextFollowUpAt) {
      data.nextFollowUpAt = addDays(new Date(), followUpDaysDefault);
    }
  }
  if (appliedAt !== undefined) {
    data.appliedAt = appliedAt ? new Date(appliedAt) : null;
  } else if (status === "APPLIED" && existing.appliedAt === null) {
    data.appliedAt = new Date();
  }

  await db.lead.update({ where: { id: leadId }, data });

  if (status === "READY_TO_CONTACT" && !existing.outreachNormal && !existing.outreachCold) {
    try {
      await generateLeadPitches(leadId, false);
    } catch {}
  }

  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/leads");
  revalidatePath("/saved");
}

export async function updateLeadStatusWithAutomationZ(leadId: string, status: string) {
  const user = await requireOnboardedUser();
  const parsed = leadStatusSchema.safeParse(status);
  if (!parsed.success) throw new Error("Invalid status");
  const existing = await db.lead.findFirst({ where: { id: leadId, userId: user.id } });
  if (!existing) throw new Error("Lead not found");
  const data: any = { status: parsed.data };
  if (status === "CONTACTED") {
    data.lastContactedAt = new Date();
    if (!existing.nextFollowUpAt) {
      data.nextFollowUpAt = addDays(new Date(), followUpDaysDefault);
    }
  }
  await db.lead.update({ where: { id: leadId }, data });
  if (status === "READY_TO_CONTACT" && !existing.outreachNormal && !existing.outreachCold) {
    try { await generateLeadPitches(leadId, false); } catch {}
  }
  revalidatePath("/leads");
  revalidatePath("/saved");
  return { ok: true };
}
