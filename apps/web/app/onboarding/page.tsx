import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { prisma } from "@o-radar/db";
import { completeOnboarding } from "./actions";
import { Radar } from "lucide-react";

const roles = [
  "Product / UI design",
  "Frontend development",
  "Community & growth",
  "Content & brand",
  "Research & strategy",
];
const chains = [
  "Solana",
  "Ethereum",
  "Base",
  "Arbitrum",
  "Stacks",
  "Multichain",
];

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) redirect("/signin");
  if (user.onboardingComplete) redirect("/");

  return (
    <main className="onboarding-page">
      <div className="onboarding-top">
        <div className="brand">
          <span className="brand-mark">
            <Radar size={17} strokeWidth={2.5} />
          </span>
          <span>O-Radar</span>
        </div>
        <span className="onboarding-step">SETUP / 01</span>
      </div>
      <section className="onboarding-intro">
        <p className="eyebrow">Make the radar yours</p>
        <h1>What should we look for?</h1>
        <p>
          Tell us enough to make the first feed useful. You can refine this
          later.
        </p>
      </section>
      <form action={completeOnboarding} className="onboarding-form">
        <input type="hidden" name="email" value={session.user.email} />
        <label className="field field-wide">
          <span>Primary niche</span>
          <input
            defaultValue={user.niche ?? ""}
            name="niche"
            placeholder="e.g. Product design for early-stage Web3 teams"
            required
          />
        </label>
        <fieldset className="field-group">
          <legend>What kind of work are you open to?</legend>
          <div className="choice-grid">
            {roles.map((role) => (
              <label className="choice-card" key={role}>
                <input
                  defaultChecked={user.targetRoles.includes(role)}
                  name="roles"
                  type="checkbox"
                  value={role}
                />
                <span>{role}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="field-group">
          <legend>Which ecosystems should we prioritize?</legend>
          <div className="choice-grid">
            {chains.map((chain) => (
              <label className="choice-card" key={chain}>
                <input
                  defaultChecked={user.targetChains.includes(chain)}
                  name="chains"
                  type="checkbox"
                  value={chain}
                />
                <span>{chain}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-split">
          <label className="field">
            <span>
              Portfolio URL <small>optional</small>
            </span>
            <input
              defaultValue={user.portfolioUrl ?? ""}
              name="portfolioUrl"
              placeholder="https://..."
              type="url"
            />
          </label>
          <label className="field">
            <span>
              GitHub URL <small>optional</small>
            </span>
            <input
              defaultValue={user.githubUrl ?? ""}
              name="githubUrl"
              placeholder="https://github.com/..."
              type="url"
            />
          </label>
        </div>
        <label className="field field-wide">
          <span>
            CV or experience summary <small>optional for now</small>
          </span>
          <textarea
            defaultValue={user.cvText ?? ""}
            name="cvText"
            placeholder="Paste your CV, services, or a short summary of your experience..."
            rows={6}
          />
        </label>
        <div className="form-submit">
          <p>We use this to rank signals and shape future outreach drafts.</p>
          <button className="primary-submit" type="submit">
            Build my radar <span aria-hidden="true">↗</span>
          </button>
        </div>
      </form>
    </main>
  );
}
