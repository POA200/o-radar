"use server";

import { prisma } from "@o-radar/db";
import { redirect } from "next/navigation";
import { z } from "zod";

const onboardingSchema = z.object({
  email: z.string().email(),
  niche: z.string().trim().min(2).max(160),
  roles: z.array(z.string()).default([]),
  chains: z.array(z.string()).default([]),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  cvText: z.string().trim().max(20000).optional(),
});

export async function completeOnboarding(formData: FormData) {
  const parsed = onboardingSchema.parse({
    email: formData.get("email"),
    niche: formData.get("niche"),
    roles: formData.getAll("roles"),
    chains: formData.getAll("chains"),
    portfolioUrl: formData.get("portfolioUrl"),
    githubUrl: formData.get("githubUrl"),
    cvText: formData.get("cvText"),
  });

  await prisma.user.update({
    where: { email: parsed.email },
    data: {
      niche: parsed.niche,
      targetRoles: parsed.roles,
      targetChains: parsed.chains,
      portfolioUrl: parsed.portfolioUrl || null,
      githubUrl: parsed.githubUrl || null,
      cvText: parsed.cvText || null,
      onboardingComplete: true,
    },
  });

  redirect("/");
}