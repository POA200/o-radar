import { prisma } from "@o-radar/db";
import { redirect } from "next/navigation";
import { auth } from "../auth";

export async function requireOnboardedUser() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/signin");
  if (!user.onboardingComplete) redirect("/onboarding");

  return user;
}