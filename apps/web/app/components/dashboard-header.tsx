import {
  Activity,
  LayoutList,
  Radar,
  Settings2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

type DashboardHeaderProps = {
  activeTab: "feed" | "leads" | "settings";
};

const tabs = [
  { href: "/", label: "Feed", icon: LayoutList, key: "feed" },
  { href: "/leads", label: "Leads", icon: UsersRound, key: "leads" },
  { href: "/settings", label: "Settings", icon: Settings2, key: "settings" },
] as const;

export function DashboardHeader({ activeTab }: DashboardHeaderProps) {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark">
          <Radar size={17} strokeWidth={2.5} />
        </span>
        <span>O-Radar</span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        {tabs.map(({ href, label, icon: Icon, key }) => (
          <Link
            className={`nav-link ${activeTab === key ? "nav-link-active" : ""}`}
            href={href}
            key={key}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="sync-status" title="Ingestion services are online">
        <span className="status-dot" />
        <Activity size={14} />
        <span>Synced 2m ago</span>
      </div>
    </header>
  );
}
