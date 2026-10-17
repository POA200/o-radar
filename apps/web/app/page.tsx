import { prisma } from "@o-radar/db";
import { DashboardHeader } from "./components/dashboard-header";
import { OpportunityFeed } from "./components/opportunity-feed";
import { requireOnboardedUser } from "../src/require-user";

export const dynamic = "force-dynamic";

const intentKeywords = [
  "looking for designer",
  "grant proposal",
  "bounty",
  "smart contract audit",
  "ui overhaul",
];

type OpportunityRecord = {
  id: string;
  title: string;
  source: string;
  url: string;
  content: string;
  score: number;
  createdAt: Date;
  evidences: Array<{ rawPayload: unknown }>;
};

function getKeywordMatches(title: string, content: string) {
  const searchable = `${title} ${content}`.toLowerCase();

  return intentKeywords.filter((keyword) => searchable.includes(keyword));
}

async function getOpportunities() {
  try {
    const opportunities = await prisma.opportunity.findMany({
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 30,
      include: {
        evidences: {
          orderBy: { capturedAt: "desc" },
          take: 1,
        },
      },
    });

    return opportunities.map((opportunity: OpportunityRecord) => ({
      id: opportunity.id,
      title: opportunity.title,
      source: opportunity.source,
      url: opportunity.url,
      content: opportunity.content,
      score: opportunity.score,
      createdAt: opportunity.createdAt.toISOString(),
      keywords: getKeywordMatches(opportunity.title, opportunity.content),
      evidence: opportunity.evidences[0]?.rawPayload ?? {},
    }));
  } catch {
    return [];
  }
}

export default async function Home() {
  await requireOnboardedUser();
  const opportunities = await getOpportunities();

  return (
    <div className="app-shell">
      <DashboardHeader activeTab="feed" />
      <main className="page-content">
        <section className="page-heading">
          <div>
            <p className="eyebrow">Opportunity intelligence</p>
            <h1>Signal feed</h1>
            <p className="page-description">
              Fresh intent signals, ranked and ready for review.
            </p>
          </div>
          <div className="heading-stat">
            <span className="stat-label">Visible signals</span>
            <strong>{opportunities.length.toString().padStart(2, "0")}</strong>
          </div>
        </section>
        <OpportunityFeed opportunities={opportunities} />
      </main>
    </div>
  );
}
