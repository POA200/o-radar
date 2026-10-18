"use server";

import { prisma } from "@o-radar/db";
import { GitHubScraper } from "@o-radar/db/scrapers/github";
import { RssScraper } from "@o-radar/db/scrapers/rss";
import { recordSourceHealth } from "@o-radar/db/scrapers/source-adapter";
import { revalidatePath } from "next/cache";
import { requireOnboardedUser } from "../src/require-user";
import { signOut } from "../auth";
import { z } from "zod";

type LeadStatus = "DISCOVERED" | "RESEARCHING" | "QUALIFIED" | "READY_TO_CONTACT" | "CONTACTED" | "REPLIED" | "IN_PROGRESS" | "WON" | "LOST" | "CONVERTED" | "ARCHIVED";

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

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const user = await requireOnboardedUser();
  await prisma.lead.updateMany({
    where: { id: leadId, userId: user.id },
    data: {
      status,
      ...(status === "CONTACTED" ? { lastContactedAt: new Date() } : {}),
    },
  });
  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/leads");
  revalidatePath("/saved");
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