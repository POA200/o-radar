"use client";

import { updateLeadNotes, updateLeadStatus } from "../actions";
import { ExternalLink, FileText, Github, Save } from "lucide-react";
import { useTransition } from "react";

type Lead = {
  id: string;
  handle: string;
  platform: string;
  profileUrl: string | null;
  status: "DISCOVERED" | "QUALIFIED" | "CONTACTED" | "CONVERTED" | "ARCHIVED";
  notes: string | null;
  opportunityTitle: string;
  opportunityUrl: string;
};

const statuses = [
  "DISCOVERED",
  "QUALIFIED",
  "CONTACTED",
  "CONVERTED",
  "ARCHIVED",
] as const;

export function LeadTable({ leads }: { leads: Lead[] }) {
  if (leads.length === 0)
    return (
      <div className="empty-state">
        <FileText size={24} />
        <h2>No leads in the workspace</h2>
        <p>Promote an opportunity from the feed to start your pipeline.</p>
      </div>
    );

  return (
    <div className="lead-table-wrap">
      <table className="lead-table">
        <thead>
          <tr>
            <th>Contact</th>
            <th>Source opportunity</th>
            <th>Status</th>
            <th>Notes</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  const [isPending, startTransition] = useTransition();

  function changeStatus(status: Lead["status"]) {
    startTransition(() => updateLeadStatus(lead.id, status));
  }

  return (
    <tr>
      <td>
        <div className="contact-cell">
          <span className="avatar">
            <Github size={16} />
          </span>
          <div>
            <strong>{lead.handle}</strong>
            <span className="platform-label">{lead.platform}</span>
          </div>
        </div>
      </td>
      <td>
        <a
          className="opportunity-link"
          href={lead.opportunityUrl}
          rel="noreferrer"
          target="_blank"
        >
          {lead.opportunityTitle}
          <ExternalLink size={13} />
        </a>
      </td>
      <td>
        <select
          className={`status-select status-${lead.status.toLowerCase()}`}
          disabled={isPending}
          onChange={(event) =>
            changeStatus(event.target.value as Lead["status"])
          }
          value={lead.status}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </td>
      <td>
        <form
          action={async (formData) => {
            await updateLeadNotes(lead.id, String(formData.get("notes") ?? ""));
          }}
          className="notes-form"
        >
          <input
            defaultValue={lead.notes ?? ""}
            name="notes"
            placeholder="Add context..."
          />
          <button title="Save notes" type="submit">
            <Save size={14} />
          </button>
        </form>
      </td>
      <td>
        <span className="row-arrow">↗</span>
      </td>
    </tr>
  );
}
