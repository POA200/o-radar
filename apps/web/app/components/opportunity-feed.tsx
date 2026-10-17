"use client";

import { archiveOpportunity, promoteOpportunityToLead } from "../actions";
import {
  ArrowUpRight,
  Archive,
  Check,
  ExternalLink,
  GitPullRequest,
  Radar,
  Search,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";

type Opportunity = {
  id: string;
  title: string;
  source: string;
  url: string;
  content: string;
  score: number;
  createdAt: string;
  keywords: string[];
  evidence: unknown;
};

function formatFreshness(timestamp: string) {
  const minutes = Math.max(
    1,
    Math.round((Date.now() - new Date(timestamp).getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

export function OpportunityFeed({
  opportunities,
}: {
  opportunities: Opportunity[];
}) {
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [filter, setFilter] = useState("");
  const filtered = opportunities.filter((item) =>
    item.title.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <>
      <div className="feed-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            aria-label="Search opportunities"
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search signals..."
            value={filter}
          />
        </div>
        <span className="toolbar-note">
          <GitPullRequest size={15} /> GitHub issues
        </span>
      </div>
      <div className="opportunity-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Radar size={24} />
            <h2>No signals yet</h2>
            <p>Run the GitHub scraper to populate the opportunity feed.</p>
          </div>
        ) : (
          filtered.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onOpen={() => setSelected(opportunity)}
            />
          ))
        )}
      </div>
      {selected ? (
        <EvidenceDrawer
          opportunity={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}

function OpportunityCard({
  opportunity,
  onOpen,
}: {
  opportunity: Opportunity;
  onOpen: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"promote" | "archive" | null>(null);

  function runAction(nextAction: "promote" | "archive") {
    setAction(nextAction);
    startTransition(async () => {
      if (nextAction === "promote")
        await promoteOpportunityToLead(opportunity.id);
      else await archiveOpportunity(opportunity.id);
    });
  }

  return (
    <article className="opportunity-card">
      <div className="card-score">
        <span>{opportunity.score || "--"}</span>
        <small>score</small>
      </div>
      <div className="opportunity-main">
        <div className="card-meta">
          <span className="source-tag">
            <GitPullRequest size={13} />{" "}
            {opportunity.source.replaceAll("_", " ")}
          </span>
          <span>{formatFreshness(opportunity.createdAt)}</span>
        </div>
        <button className="opportunity-title" onClick={onOpen}>
          {opportunity.title}
          <ArrowUpRight size={16} />
        </button>
        <div className="keyword-row">
          {(opportunity.keywords.length
            ? opportunity.keywords
            : ["intent signal"]
          ).map((keyword) => (
            <span className="keyword-badge" key={keyword}>
              {keyword}
            </span>
          ))}
        </div>
      </div>
      <div className="card-actions">
        <a
          className="icon-link"
          href={opportunity.url}
          rel="noreferrer"
          target="_blank"
          title="Open original source"
        >
          <ExternalLink size={16} />
        </a>
        <button
          className="text-action primary-action"
          disabled={isPending}
          onClick={() => runAction("promote")}
        >
          <Check size={15} />{" "}
          {isPending && action === "promote" ? "Saving" : "Promote"}
        </button>
        <button
          className="text-action archive-action"
          disabled={isPending}
          onClick={() => runAction("archive")}
          title="Archive opportunity"
        >
          <Archive size={15} />
        </button>
      </div>
    </article>
  );
}

function EvidenceDrawer({
  opportunity,
  onClose,
}: {
  opportunity: Opportunity;
  onClose: () => void;
}) {
  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="evidence-drawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Opportunity evidence"
      >
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Evidence record</p>
            <h2>{opportunity.title}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            title="Close evidence drawer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="drawer-section">
          <div className="section-label">Issue body</div>
          <p className="issue-body">
            {opportunity.content || "No issue body captured."}
          </p>
        </div>
        <div className="drawer-section">
          <div className="section-label">Raw payload</div>
          <pre className="json-viewer">
            {JSON.stringify(opportunity.evidence, null, 2)}
          </pre>
        </div>
        <a
          className="drawer-source-link"
          href={opportunity.url}
          rel="noreferrer"
          target="_blank"
        >
          Open original issue <ExternalLink size={15} />
        </a>
      </aside>
    </div>
  );
}
