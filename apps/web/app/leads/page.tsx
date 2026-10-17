import { prisma } from "@o-radar/db";
import { DashboardHeader } from "../components/dashboard-header";
import { LeadTable } from "../components/lead-table";
import { requireOnboardedUser } from "../../src/require-user";

export const dynamic = "force-dynamic";

type LeadRecord = {
  id: string;
  handle: string;
  platform: string;
  profileUrl: string | null;
  status: "DISCOVERED" | "QUALIFIED" | "CONTACTED" | "CONVERTED" | "ARCHIVED";
  notes: string | null;
  opportunity: { title: string; url: string };
};

async function getLeads() {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { updatedAt: "desc" },
      include: { opportunity: { select: { title: true, url: true } } },
    });

    return leads.map((lead: LeadRecord) => ({
      id: lead.id,
      handle: lead.handle,
      platform: lead.platform,
      profileUrl: lead.profileUrl,
      status: lead.status,
      notes: lead.notes,
      opportunityTitle: lead.opportunity.title,
      opportunityUrl: lead.opportunity.url,
    }));
  } catch {
    return [];
  }
}

export default async function LeadsPage() {
  await requireOnboardedUser();
  const leads = await getLeads();

  return (
    <div className="app-shell">
      <DashboardHeader activeTab="leads" />
      <main className="page-content">
        <section className="page-heading">
          <div>
            <p className="eyebrow">Pipeline workspace</p>
            <h1>Leads</h1>
            <p className="page-description">
              Turn raw signals into deliberate outreach.
            </p>
          </div>
          <div className="heading-stat">
            <span className="stat-label">Tracked leads</span>
            <strong>{leads.length.toString().padStart(2, "0")}</strong>
          </div>
        </section>
        <LeadTable leads={leads} />
      </main>
    </div>
  );
}
