"use client";

import { useEffect, useState } from "react";
import type { LeadStatus } from "@/lib/types";
import { ownerLabel } from "@/lib/team";

type ActivityEvent = {
  id: string;
  event_text: string;
  event_type: string;
  created_at: string;
};

function dateIn(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function humanTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function NotesFollowUp({
  leadId,
  companyName,
  notes,
  followUpDate,
  status,
  owner,
  onFollowUpDateChange,
}: {
  leadId: string;
  companyName: string;
  notes: string | null;
  followUpDate: string | null;
  status: LeadStatus;
  owner: string;
  onFollowUpDateChange?: (leadId: string, date: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notesValue, setNotesValue] = useState(notes ?? "");
  const [dateValue, setDateValue] = useState(followUpDate ?? "");
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setNotesValue(notes ?? "");
    setDateValue(followUpDate ?? "");
  }, [notes, followUpDate]);

  async function loadActivity() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/activity`);
      const data = await res.json();
      if (res.ok) setEvents(data.events ?? []);
      else setMessage(data.error ?? "Couldn't load activity.");
    } catch {
      setMessage("Couldn't load activity.");
    } finally {
      setLoading(false);
    }
  }

  async function openWorkspace() {
    setOpen(true);
    setMessage("");
    await loadActivity();
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notesValue.trim(),
          follow_up_date: dateValue || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Couldn't save your update.");
        return;
      }
      onFollowUpDateChange?.(leadId, dateValue || null);
      setMessage("Saved.");
      await loadActivity();
    } catch {
      setMessage("Couldn't reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const isDue = Boolean(followUpDate && followUpDate <= new Date().toISOString().slice(0, 10));

  return (
    <>
      <button
        onClick={openWorkspace}
        className={`border px-2 py-1 text-[10px] font-semibold tracking-wide ${
          isDue
            ? "border-amber-700 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40"
            : "border-neutral-700 bg-black text-neutral-300 hover:border-emerald-700 hover:text-emerald-400"
        }`}
      >
        {isDue ? "⚑ FOLLOW-UP DUE" : "⌁ WORKSPACE"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-emerald-800 bg-neutral-950 shadow-2xl shadow-black">
            <div className="flex items-start justify-between border-b border-emerald-900 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.18em] text-emerald-500">LEAD WORKSPACE</p>
                <h2 className="mt-1 text-lg font-semibold text-neutral-100">{companyName}</h2>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                  <span className="border border-neutral-700 px-2 py-0.5 text-neutral-300">{status}</span>
                  <span className="border border-neutral-800 px-2 py-0.5 text-neutral-500">Owner: {ownerLabel(owner)}</span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-lg text-neutral-500 hover:text-neutral-100" aria-label="Close workspace">×</button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr]">
              <section>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold tracking-wider text-amber-400">NOTES / NEXT STEP</label>
                  <span className="text-[10px] text-neutral-600">Visible to the team</span>
                </div>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Example: Spoke to CFO — Mexico supplier payments every month. Send hedging overview Tuesday."
                  className="mt-2 h-36 w-full resize-y border border-neutral-700 bg-black p-3 text-xs leading-relaxed text-neutral-200 outline-none focus:border-amber-700"
                />

                <label className="mt-5 block text-[11px] font-semibold tracking-wider text-amber-400">FOLLOW-UP DATE</label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={dateValue}
                    onChange={(e) => setDateValue(e.target.value)}
                    className="border border-neutral-700 bg-black px-2 py-1.5 text-xs text-neutral-200 outline-none focus:border-amber-700"
                  />
                  <button onClick={() => setDateValue(dateIn(1))} className="border border-neutral-700 px-2 py-1.5 text-[10px] text-neutral-400 hover:border-emerald-700 hover:text-emerald-400">Tomorrow</button>
                  <button onClick={() => setDateValue(dateIn(3))} className="border border-neutral-700 px-2 py-1.5 text-[10px] text-neutral-400 hover:border-emerald-700 hover:text-emerald-400">+3 days</button>
                  <button onClick={() => setDateValue(dateIn(7))} className="border border-neutral-700 px-2 py-1.5 text-[10px] text-neutral-400 hover:border-emerald-700 hover:text-emerald-400">Next week</button>
                  {dateValue && <button onClick={() => setDateValue("")} className="text-[10px] text-neutral-600 hover:text-red-400">clear</button>}
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <button onClick={save} disabled={saving} className="border border-emerald-700 bg-emerald-950/50 px-4 py-2 text-[11px] font-semibold tracking-wider text-emerald-300 hover:bg-emerald-900/50 disabled:opacity-50">
                    {saving ? "SAVING…" : "SAVE WORK"}
                  </button>
                  {message && <span className={`text-[11px] ${message === "Saved." ? "text-emerald-400" : "text-amber-400"}`}>{message}</span>}
                </div>
              </section>

              <section className="border-l border-neutral-800 pl-0 lg:pl-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold tracking-wider text-amber-400">ACTIVITY TIMELINE</p>
                  <button onClick={loadActivity} className="text-[10px] text-neutral-500 hover:text-emerald-400">refresh</button>
                </div>
                <div className="mt-3 max-h-[360px] overflow-y-auto border-t border-neutral-800">
                  {loading ? (
                    <p className="py-4 text-[11px] text-neutral-500">Loading activity…</p>
                  ) : events.length ? (
                    events.map((event) => (
                      <div key={event.id} className="border-b border-neutral-900 py-3">
                        <p className="text-[11px] leading-relaxed text-neutral-300">{event.event_text}</p>
                        <p className="mt-1 text-[10px] text-neutral-600">{humanTime(event.created_at)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-[11px] text-neutral-600">No activity yet. Claim the lead, update its status, or add a note to start the history.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
