import { Radar, ShieldCheck } from "lucide-react";
import { signIn } from "../../auth";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand auth-brand">
          <span className="brand-mark">
            <Radar size={17} strokeWidth={2.5} />
          </span>
          <span>O-Radar</span>
        </div>
        <div className="auth-copy">
          <p className="eyebrow">Personal opportunity intelligence</p>
          <h1>Find the work that fits you.</h1>
          <p>
            Sign in to shape your radar around your skills, niche, and the kind
            of teams you want to work with.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/onboarding" });
          }}
        >
          <button className="google-button" type="submit">
            <GoogleMark /> Continue with Google{" "}
            <span aria-hidden="true">↗</span>
          </button>
        </form>
        <p className="auth-footnote">
          <ShieldCheck size={14} /> Your profile stays private to your
          workspace.
        </p>
      </section>
      <aside className="auth-aside">
        <span className="aside-index">O-RADAR / 01</span>
        <div>
          <p className="aside-quote">
            A sharper signal starts with knowing what you are looking for.
          </p>
          <span className="aside-caption">
            Your preferences become the filter behind every discovery.
          </span>
        </div>
      </aside>
    </main>
  );
}

function GoogleMark() {
  return (
    <span className="google-mark" aria-hidden="true">
      G
    </span>
  );
}
