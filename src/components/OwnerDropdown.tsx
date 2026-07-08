"use client";

import { useState } from "react";
import { OWNER_OPTIONS, UNASSIGNED } from "@/lib/team";

export default function OwnerDropdown({
  leadId,
  owner,
  onOwnerChange,
}: {
  leadId: string;
  owner: string;
  onOwnerChange?: (leadId: string, owner: string) => void;
}) {
  const [current, setCurrent] = useState(owner);
  const [saving, setSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setCurrent(next);
    onOwnerChange?.(leadId, next);
    setSaving(true);
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: next }),
      });
    } finally {
      setSaving(false);
    }
  }

  const known = OWNER_OPTIONS.some((o) => o.value === current);
  return (
    <select
      value={known ? current : UNASSIGNED}
      onChange={handleChange}
      disabled={saving}
      className="border border-neutral-700 bg-black px-1.5 py-1 text-[10px] text-neutral-300 outline-none focus:border-emerald-600 disabled:opacity-50"
    >
      {OWNER_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
