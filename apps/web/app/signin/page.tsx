import {
  ArrowUpRight,
  Check,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "../../auth";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="auth-showcase">
        <div className="auth-showcase-top">
          <div className="brand auth-brand">
            <span className="brand-mark">
              <Radar size={17} strokeWidth={2.5} />
            </span>
            <span>O-Radar</span>
          </div>
          <span className="auth-version">Private beta</span>
        </div>
        <div className="auth-showcase-copy">
          <span className="auth-kicker">
            <Sparkles size={13} /> Opportunity intelligence
          </span>
          <h1>Turn noisy ecosystems into your next move.</h1>
          <p>
            One focused radar for jobs, bounties, grants, and the project
            signals worth following.
          </p>
        </div>
        <div className="auth-signal-card">
          <div className="auth-signal-header">
            <span>
              <span className="auth-live-dot" /> Radar status
            </span>
            <span className="auth-live-label">Live</span>
          </div>
          <div className="auth-signal-line">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="auth-signal-footer">
            <span>Sources are weighted by evidence</span>
            <ArrowUpRight size={14} />
          </div>
        </div>
        <div className="auth-showcase-note">
          <Check size={14} />{" "}
          <span>
            Built for independent builders who value signal over volume.
          </span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand brand">
          <span className="brand-mark">
            <Radar size={17} strokeWidth={2.5} />
          </span>
          <span>O-Radar</span>
        </div>
        <div className="auth-card">
          <div className="auth-copy">
            <p className="eyebrow">Welcome to O-Radar</p>
            <h2>Find the work that fits you.</h2>
            <p>
              Sign in to personalize your radar around your skills, niche, and
              the teams you want to work with.
            </p>
          </div>
          <div className="auth-divider">
            <span>Continue securely</span>
          </div>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/onboarding" });
            }}
          >
            <Button className="w-full cursor-pointer" size="lg" type="submit">
              <GoogleMark /> <span>Continue with Google</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Button>
          </form>
          <p className="auth-footnote">
            <ShieldCheck size={14} />{" "}
            <span>Your profile stays private to your workspace.</span>
          </p>
        </div>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <span className="google-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img">
        <path
          fill="#4285F4"
          d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.23a4.47 4.47 0 0 1-1.94 2.93v2.44h3.14c1.84-1.7 2.92-4.2 2.92-7.24Z"
        />
        <path
          fill="#34A853"
          d="M12 21.73c2.63 0 4.84-.87 6.45-2.35l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.52A9.74 9.74 0 0 0 12 21.73Z"
        />
        <path
          fill="#FBBC05"
          d="M6.53 13.83a5.86 5.86 0 0 1 0-3.66V7.65H3.29a9.73 9.73 0 0 0 0 8.7l3.24-2.52Z"
        />
        <path
          fill="#EA4335"
          d="M12 6.14c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.83 3.25 14.63 2.27 12 2.27a9.74 9.74 0 0 0-8.71 5.38l3.24 2.52C7.3 7.86 9.46 6.14 12 6.14Z"
        />
      </svg>
    </span>
  );
}
