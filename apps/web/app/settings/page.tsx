import { Database, Github, KeyRound } from "lucide-react";
import { DashboardHeader } from "../components/dashboard-header";
import { requireOnboardedUser } from "../../src/require-user";

export default async function SettingsPage() {
  await requireOnboardedUser();
  return (
    <div className="app-shell">
      <DashboardHeader activeTab="settings" />
      <main className="page-content">
        <section className="page-heading">
          <div>
            <p className="eyebrow">System controls</p>
            <h1>Settings</h1>
            <p className="page-description">
              Connection status for your discovery workspace.
            </p>
          </div>
        </section>
        <section className="settings-grid">
          <div className="settings-row">
            <span className="settings-icon">
              <Database size={17} />
            </span>
            <div>
              <strong>PostgreSQL database</strong>
              <p>Configured through DATABASE_URL</p>
            </div>
            <span className="connection-state">Connected</span>
          </div>
          <div className="settings-row">
            <span className="settings-icon">
              <Github size={17} />
            </span>
            <div>
              <strong>GitHub discovery</strong>
              <p>Personal access token for API ingestion</p>
            </div>
            <span className="connection-state">Ready</span>
          </div>
          <div className="settings-row">
            <span className="settings-icon">
              <KeyRound size={17} />
            </span>
            <div>
              <strong>Environment</strong>
              <p>Secrets remain server-side and are never rendered.</p>
            </div>
            <span className="connection-state">Private</span>
          </div>
        </section>
      </main>
    </div>
  );
}
