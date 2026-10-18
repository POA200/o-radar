import { prisma } from "@o-radar/db";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { PageHeading } from "@/components/shared/page-heading";
import { ModernLeadTable, type LeadItem } from "@/components/lead/lead-table";
import { requireOnboardedUser } from "../../src/require-user";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const user = await requireOnboardedUser();

  const [activeLeadsCount, latestSync, leadsRaw] = await Promise.all([
    prisma.lead.count({
      where: { userId: user.id, status: { not: "ARCHIVED" } },
    }),
    prisma.opportunity.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.lead.findMany({
      where: { userId: user.id },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      include: {
        opportunity: {
          select: {
            id: true,
            title: true,
            url: true,
            source: true,
          },
        },
      },
    }),
  ]);

  const leads: LeadItem[] = leadsRaw.map((l) => ({
    id: l.id,
    handle: l.handle,
    platform: l.platform,
    profileUrl: l.profileUrl,
    status: l.status,
    notes: l.notes,
    opportunityTitle: l.opportunity.title,
    opportunityUrl: l.opportunity.url,
    opportunityId: l.opportunity.id,
    opportunityType: l.opportunity.source,
    priority: l.priority,
    savedAt: l.savedAt.toISOString(),
    lastContactedAt: l.lastContactedAt?.toISOString() ?? null,
    nextFollowUpAt: l.nextFollowUpAt?.toISOString() ?? null,
    updatedAt: l.updatedAt.toISOString(),
  }));

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        niche: user.niche,
      }}
      lastSyncTime={latestSync?.createdAt}
      activeLeadsCount={activeLeadsCount}
    >
      <div className="py-6 sm:py-8">
        <ResponsiveContainer size="wide" className="space-y-6">
          <PageHeading
            title="My Leads"
            description="Manage discovered project leads, update outreach statuses, and keep notes on conversations."
            eyebrow="Pipeline CRM"
          />

          <ModernLeadTable leads={leads} />
        </ResponsiveContainer>
      </div>
    </AppShell>
  );
}
