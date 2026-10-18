import { prisma } from "@o-radar/db";
import { Database, Github, KeyRound, CheckCircle2, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { PageHeading } from "@/components/shared/page-heading";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { requireOnboardedUser } from "../../src/require-user";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireOnboardedUser();

  const [activeLeadsCount, latestSync] = await Promise.all([
    prisma.lead.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.opportunity.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  const hasGithubPat = Boolean(process.env.GITHUB_PAT);

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
        <ResponsiveContainer size="wide" className="space-y-8">
          <PageHeading
            title="Workspace Settings"
            description="Manage your matching radar preferences, target ecosystems, and connection credentials."
            eyebrow="Preferences & System"
          />

          {/* Radar Match Preferences Form */}
          <div className="space-y-4">
            <SectionHeading
              title="Opportunity Radar Calibration"
              description="Configure roles, skills, and ecosystems to personalize your opportunity match scores"
              eyebrow="Matching Profile"
            />

            <ProfileSettingsForm
              initialData={{
                niche: user.niche,
                targetRoles: user.targetRoles,
                targetChains: user.targetChains,
                skills: user.skills,
                portfolioUrl: user.portfolioUrl,
                githubUrl: user.githubUrl,
                cvText: user.cvText,
              }}
            />
          </div>

          {/* System Connections Status */}
          <div className="space-y-4 pt-4 border-t border-border/80">
            <SectionHeading
              title="System Integration Status"
              description="Live connection health for databases and data providers"
              eyebrow="Infrastructure"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* PostgreSQL Neon */}
              <Card className="bg-card/60 border-border/80">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="grid size-8 place-items-center rounded bg-primary/10 border border-primary/30 text-primary shrink-0">
                    <Database className="size-4" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs text-foreground">PostgreSQL (Neon)</span>
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[9px]">
                        Connected
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">Prisma Client active via DATABASE_URL</p>
                  </div>
                </CardContent>
              </Card>

              {/* GitHub API PAT */}
              <Card className="bg-card/60 border-border/80">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="grid size-8 place-items-center rounded bg-secondary border border-border text-foreground shrink-0">
                    <Github className="size-4" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs text-foreground">GitHub Scraper API</span>
                      <Badge
                        variant="outline"
                        className={
                          hasGithubPat
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[9px]"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono text-[9px]"
                        }
                      >
                        {hasGithubPat ? "Authenticated" : "Public Rate Limits"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {hasGithubPat ? "5,000 req/hr rate limit active" : "GITHUB_PAT not set (60 req/hr limit)"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Server Security */}
              <Card className="bg-card/60 border-border/80">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="grid size-8 place-items-center rounded bg-secondary border border-border text-foreground shrink-0">
                    <KeyRound className="size-4" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs text-foreground">Secrets & Auth</span>
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[9px]">
                        Secured
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">Encrypted server-side via NextAuth</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ResponsiveContainer>
      </div>
    </AppShell>
  );
}
