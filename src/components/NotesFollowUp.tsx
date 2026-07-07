"use client";

import { useState } from "react";

export default function NotesFollowUp({
  leadId,
  notes,
  followUpDate,
  onFollowUpDateChange,
}: {
  leadId: string;
  notes: string | null;
  followUpDate: string | null;
  onFollowUpDateChange?: (leadId: string, date: string | null) => void;
}) {
  const [notesValue, setNotesValue] = useState(notes ?? "");
  const [dateValue, setDateValue] = useState(followUpDate ?? "");

  async function save(fields: { notes?: string; follow_up_date?: string | null }) {
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        type="text"
        value={notesValue}
        onChange={(e) => setNotesValue(e.target.value)}
        onBlur={() => save({ notes: notesValue })}
        placeholder="Add note…"
        className="w-40 border border-neutral-800 bg-black px-1.5 py-1 text-[10px] text-neutral-300 outline-none focus:border-emerald-700"
      />
      <input
        type="date"
        value={dateValue}
        onChange={(e) => {
          const value = e.target.value || null;
          setDateValue(e.target.value);
          save({ follow_up_date: value });
          onFollowUpDateChange?.(leadId, value);
        }}
        className="w-40 border border-neutral-800 bg-black px-1.5 py-1 text-[10px] text-neutral-300 outline-none focus:border-emerald-700"
      />
    </div>
  );
}
