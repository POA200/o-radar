"use server";

import { prisma } from "@o-radar/db";
import { revalidatePath } from "next/cache";

type LeadStatus = "DISCOVERED" | "QUALIFIED" | "CONTACTED" | "CONVERTED" | "ARCHIVED";

async function getAuthor(opportunityId: string) {
  const evidence = await prisma.evidence.findFirst({
    where: { opportunityId },
    orderBy: { capturedAt: "desc" },
  });
  const rawPayload = evidence?.rawPayload;

  if (rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)) {
    const author = (rawPayload as { author?: unknown }).author;

    if (author && typeof author === "object" && !Array.isArray(author)) {
      const handle = (author as { handle?: unknown }).handle;
      const profileUrl = (author as { profileUrl?: unknown }).profileUrl;

      if (typeof handle === "string") {
        return {
          handle,
          profileUrl: typeof profileUrl === "string" ? profileUrl : undefined,
        };
      }
    }
  }

  return { handle: `opportunity-${opportunityId.slice(-8)}` };
}

export async function promoteOpportunityToLead(opportunityId: string) {
  const author = await getAuthor(opportunityId);
  const existingLead = await prisma.lead.findFirst({
    where: { opportunityId, platform: "GITHUB", handle: author.handle },
  });

  if (existingLead) {
    await prisma.lead.update({
      where: { id: existingLead.id },
      data: { status: "QUALIFIED", profileUrl: author.profileUrl },
    });
  } else {
    await prisma.lead.create({
      data: {
        opportunityId,
        handle: author.handle,
        platform: "GITHUB",
        profileUrl: author.profileUrl,
        status: "QUALIFIED",
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/leads");
}

export async function archiveOpportunity(opportunityId: string) {
  const author = await getAuthor(opportunityId);
  const existingLead = await prisma.lead.findFirst({
    where: { opportunityId, platform: "GITHUB", handle: author.handle },
  });

  if (existingLead) {
    await prisma.lead.update({ where: { id: existingLead.id }, data: { status: "ARCHIVED" } });
  } else {
    await prisma.lead.create({
      data: {
        opportunityId,
        handle: author.handle,
        platform: "GITHUB",
        profileUrl: author.profileUrl,
        status: "ARCHIVED",
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/leads");
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  await prisma.lead.update({ where: { id: leadId }, data: { status } });
  revalidatePath("/leads");
}

export async function updateLeadNotes(leadId: string, notes: string) {
  await prisma.lead.update({ where: { id: leadId }, data: { notes: notes.trim() || null } });
  revalidatePath("/leads");
}