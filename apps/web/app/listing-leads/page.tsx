import { prisma } from "@o-radar/db";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { PageHeading } from "@/components/shared/page-heading";
import { ListingLeadTable } from "@/components/listing-lead/listing-lead-table";
import { requireOnboardedUser } from "../../src/require-user";

export const dynamic = "force-dynamic";

type ListingLeadRow = Awaited<ReturnType<typeof prisma.listingLead.findMany>>[number];

export default async function ListingLeadsPage() {
  const user = await requireOnboardedUser();

  const [activeLeadsCount, latestSync] = await Promise.all([
    prisma.lead.count({ where: { userId: user.id, status: { not: "ARCHIVED" } } }),
    prisma.opportunity.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  let leads: ListingLeadRow[] = [];
  let loadError: string | null = null;
  let migrationPending = false;
  try {
    leads = await prisma.listingLead.findMany({
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    });
  } catch (e) {
    const err = e as { code?: string; message?: string } | null;
    const isMissingTable =
      err?.code === "P2021" && /ListingLead/i.test(err?.message ?? "");
    if (isMissingTable) {
      migrationPending = true;
      loadError = "The ListingLead table does not exist yet. Apply migration 20261019000000_add_listing_leads.";
    } else {
      loadError = e instanceof Error ? e.message : "Failed to load listing leads";
    }
  }

  const items = leads.map((l) => ({
    id: l.id,
    projectName: l.projectName,
    tokenSymbol: l.tokenSymbol,
    chain: l.chain,
    contractAddress: l.contractAddress,
    websiteUrl: l.websiteUrl,
    xUrl: l.xUrl,
    telegramUrl: l.telegramUrl,
    discordUrl: l.discordUrl,
    discoverySource: l.discoverySource,
    sourceUrl: l.sourceUrl,
    volume24hUsd: l.volume24hUsd,
    holderCount: l.holderCount,
    listingStatus: l.listingStatus,
    priority: l.priority,
    contactName: l.contactName,
    contactEmail: l.contactEmail,
    contactTelegram: l.contactTelegram,
    notes: l.notes,
    lastContactedAt: l.lastContactedAt?.toISOString() ?? null,
    nextFollowUpAt: l.nextFollowUpAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));

  return (
    <AppShell
      user={{ name: user.name, email: user.email, image: user.image, niche: user.niche }}
      lastSyncTime={latestSync?.createdAt}
      activeLeadsCount={activeLeadsCount}
    >
      <div className="py-6 sm:py-8">
        <ResponsiveContainer size="wide" className="space-y-6">
          <PageHeading
            title="Listing Leads"
            description="Track CEX listing prospects: project, token, market metrics, outreach status, and follow-ups."
            eyebrow="Listing Pipeline"
          />
          {loadError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {migrationPending
                ? "Could not load listing leads. The database table may not exist yet — apply the pending migration `20261019000000_add_listing_leads`."
                : `Failed to load listing leads: ${loadError}`}
            </div>
          ) : (
            <ListingLeadTable leads={items} />
          )}
        </ResponsiveContainer>
      </div>
    </AppShell>
  );
}
