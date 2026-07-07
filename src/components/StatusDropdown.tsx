"use client";

import { useState } from "react";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";

const DISCARD_VALUE = "__discard__";

function statusBadgeClass(status: string): string {
  switch (status) {
    case "Client":
      return "bg-emerald-950 text-emerald-400 border-emerald-800";
    case "Prospect":
      return "bg-cyan-950 text-cyan-400 border-cyan-800";
    case "Contacted":
      return "bg-amber-950 text-amber-400 border-amber-800";
    case "No Answer":
      return "bg-neutral-900 text-neutral-400 border-neutral-700";
    case "No FX Need":
      return "bg-red-950 text-red-400 border-red-800";
    default:
      return "bg-neutral-900 text-neutral-400 border-neutral-700";
  }
}

export default function StatusDropdown({
  leadId,
  companyName,
  status,
  onDiscard,
  onStatusChange,
}: {
  leadId: string;
  companyName: string;
  status: LeadStatus;
  onDiscard: (leadId: string) => void;
  onStatusChange?: (leadId: string, status: LeadStatus) => void;
}) {
  const [current, setCurrent] = useState<LeadStatus>(status);
  const [saving, setSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;

    if (value === DISCARD_VALUE) {
      const confirmed = window.confirm(
        `Discard "${companyName}"? This permanently deletes the lead and its contacts.`
      );
      if (!confirmed) return;

      setSaving(true);
      try {
        const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
        if (res.ok) onDiscard(leadId);
      } finally {
        setSaving(false);
      }
      return;
    }

    const next = value as LeadStatus;
    setCurrent(next);
    onStatusChange?.(leadId, next);
    setSaving(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={saving}
      className={`border px-1.5 py-0.5 text-[10px] font-medium outline-none disabled:opacity-50 ${statusBadgeClass(current)}`}
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s} className="bg-neutral-950 text-neutral-200">
          {s}
        </option>
      ))}
      <option value={DISCARD_VALUE} className="bg-neutral-950 text-red-400">
        🗑 Discard / Delete
      </option>
    </select>
  );
}
