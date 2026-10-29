import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@o-radar/db";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireOnboardedUser } from "../../../src/require-user";
import { LeadCrmForm } from "@/components/lead/lead-crm-form";
import { LeadOutreachEditor } from "@/components/lead/lead-outreach-editor";
import { leadStatusLabel } from "@/lib/lead-status";
import { ExternalLink, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: { id, userId: user.id }, include: { opportunity: true } });
  if (!lead) notFound();

  const item: any = {
    id: lead.id,
    handle: lead.handle,
    platform: lead.platform,
    profileUrl: lead.profileUrl,
    status: lead.status,
    notes: lead.notes,
    whyInteresting: (lead as any).whyInteresting,
    nextAction: (lead as any).nextAction,
    outcome: (lead as any).outcome,
    outreachNormal: (lead as any).outreachNormal,
    outreachCold: (lead as any).outreachCold,
    priority: lead.priority,
    lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
    appliedAt: lead.appliedAt?.toISOString() ?? null,
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
    opportunityTitle: lead.opportunity.title,
    opportunityUrl: lead.opportunity.url,
    opportunityDescription: (lead.opportunity as any).description || (lead.opportunity as any).content,
    opportunitySource: lead.opportunity.source,
  };

  const activeLeadsCount = await prisma.lead.count({ where: { userId: user.id, status: { not: "ARCHIVED" } } });

  return (
    <AppShell user={{ name: user.name, email: user.email, image: user.image, niche: user.niche }} activeLeadsCount={activeLeadsCount}>
      <div className="py-6 sm:py-8">
        <ResponsiveContainer size="wide" className="space-y-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/leads"><ArrowLeft className="h-4 w-4" /> Back</Link>
            </Button>
          </div>
          <PageHeading title={item.opportunityTitle} description={`Lead · ${leadStatusLabel(item.status)}`} eyebrow="Opportunity Lead" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{item.platform}</Badge>
            <Badge variant="outline">{item.handle}</Badge>
            <a href={item.opportunityUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">View opportunity <ExternalLink className="h-3 w-3" /></a>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Opportunity</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Source:</span> {item.opportunitySource}</div>
                <div className="whitespace-pre-wrap text-xs text-muted-foreground">{item.opportunityDescription || "No description."}</div>
              </CardContent>
            </Card>
            <LeadCrmForm lead={item} />
            <LeadOutreachEditor lead={item} />
          </div>
        </ResponsiveContainer>
      </div>
    </AppShell>
  );
}
