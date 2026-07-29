"use client";

import { useMemo, useState } from "react";
import type { ClientBook } from "@/lib/types";
import { CLIENT_STATUSES, FOLLOW_UP_STATUS, clientStatusChip } from "@/lib/types";

export default function ClientBookView({ clients }: { clients: ClientBook[] }) {
  const [rows, setRows] = useState(clients);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (followUpOnly && r.status !== FOLLOW_UP_STATUS) return false;
      if (q) {
        const hay = `${r.name} ${r.consultant ?? ""} ${r.comments ?? ""} ${r.referenciador ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, followUpOnly]);

  async function saveField(id: string, fields: Partial<ClientBook>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}" from the client book?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
  }

  async function handleAdd(input: Partial<ClientBook>) {
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (res.ok && data.client) {
        setRows((prev) => [...prev, data.client]);
        setShowAdd(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-emerald-900 bg-neutral-950">
      <div className="flex items-center justify-between border-b border-emerald-900 px-3 py-2">
        <span className="text-[11px] font-semibold tracking-widest text-emerald-500">
          CLIENT BOOK
        </span>
        <span className="text-[10px] text-neutral-500">
          {filtered.length} / {rows.length}
        </span>
      </div>

      {/* Legend / counts */}
      <div className="flex flex-wrap gap-1.5 border-b border-neutral-800 px-3 py-2">
        {CLIENT_STATUSES.filter((s) => counts[s.value]).map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(statusFilter === s.value ? "All" : s.value)}
            className={`border px-1.5 py-0.5 text-[10px] font-semibold ${s.chip} ${
              statusFilter === s.value ? "ring-1 ring-amber-500" : ""
            }`}
          >
            {s.value} · {counts[s.value]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 px-3 py-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, consultant, comments…"
          className="w-56 border border-neutral-700 bg-black px-2 py-1 text-[11px] text-emerald-400 outline-none focus:border-emerald-600"
        />
        <button
          onClick={() => setFollowUpOnly((f) => !f)}
          className={`border px-2 py-1 text-[11px] font-semibold ${
            followUpOnly
              ? "border-blue-600 bg-blue-950/40 text-blue-400"
              : "border-neutral-700 text-neutral-300 hover:border-blue-700 hover:text-blue-400"
          }`}
        >
          🔵 Follow-ups ({counts[FOLLOW_UP_STATUS] ?? 0})
        </button>
        {(search || statusFilter !== "All" || followUpOnly) && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("All");
              setFollowUpOnly(false);
            }}
            className="text-[11px] text-neutral-500 hover:text-neutral-300"
          >
            clear
          </button>
        )}
        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto border border-emerald-700 bg-emerald-950/40 px-3 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-900/40"
        >
          + ADD CLIENT
        </button>
      </div>

      <div className="max-h-[70vh] overflow-auto">
        <table className="zebra w-full min-w-[1100px] border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-neutral-950">
            <tr className="border-b border-neutral-800 text-left text-[10px] uppercase tracking-wider text-neutral-500">
              <th className="px-3 py-1.5">Company</th>
              <th className="px-3 py-1.5">Status</th>
              <th className="px-3 py-1.5">SF</th>
              <th className="px-3 py-1.5">Consultant</th>
              <th className="px-3 py-1.5">Traded</th>
              <th className="px-3 py-1.5">Last follow-up</th>
              <th className="px-3 py-1.5">Follow-up</th>
              <th className="px-3 py-1.5">Comments</th>
              <th className="px-3 py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-neutral-900 hover:bg-neutral-900/50">
                <td className="whitespace-nowrap px-3 py-1.5 font-medium text-neutral-100">
                  {c.website ? (
                    <a
                      href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-amber-400"
                    >
                      {c.name}
                    </a>
                  ) : (
                    c.name
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <select
                    value={c.status}
                    onChange={(e) => saveField(c.id, { status: e.target.value })}
                    className={`border px-1.5 py-0.5 text-[10px] font-semibold outline-none ${clientStatusChip(
                      c.status
                    )}`}
                  >
                    {CLIENT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value} className="bg-neutral-950 text-neutral-200">
                        {s.value}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={c.on_sf}
                    onChange={(e) => saveField(c.id, { on_sf: e.target.checked })}
                    className="accent-sky-500"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-neutral-400">
                  {c.consultant ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-amber-300">{c.traded ?? "—"}</td>
                <td className="px-3 py-1.5">
                  <InlineText
                    value={c.last_follow_up}
                    onSave={(v) => saveField(c.id, { last_follow_up: v })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <InlineText value={c.follow_up} onSave={(v) => saveField(c.id, { follow_up: v })} />
                </td>
                <td className="px-3 py-1.5">
                  <InlineText value={c.comments} onSave={(v) => saveField(c.id, { comments: v })} wide />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    className="text-[10px] text-neutral-600 hover:text-red-400"
                    title="Delete"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-neutral-500">
                  No clients match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} onAdd={handleAdd} saving={saving} />}
    </div>
  );
}

function InlineText({
  value,
  onSave,
  wide = false,
}: {
  value: string | null;
  onSave: (v: string) => void;
  wide?: boolean;
}) {
  const [v, setV] = useState(value ?? "");
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== (value ?? "")) onSave(v);
      }}
      className={`${
        wide ? "w-48" : "w-32"
      } border border-transparent bg-transparent px-1 py-0.5 text-[11px] text-neutral-300 outline-none hover:border-neutral-700 focus:border-emerald-600`}
      placeholder="—"
    />
  );
}

function AddClientModal({
  onClose,
  onAdd,
  saving,
}: {
  onClose: () => void;
  onAdd: (input: Partial<ClientBook>) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Open and trading");
  const [consultant, setConsultant] = useState("");
  const [website, setWebsite] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [comments, setComments] = useState("");

  const field =
    "w-full border border-neutral-700 bg-black px-2 py-1.5 text-xs text-emerald-400 outline-none focus:border-emerald-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md border border-emerald-900 bg-neutral-950 p-4 font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-widest text-emerald-500">ADD CLIENT</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300">
            ✕
          </button>
        </div>
        <div className="space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name *" className={field} />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={field}>
            {CLIENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.value}
              </option>
            ))}
          </select>
          <input value={consultant} onChange={(e) => setConsultant(e.target.value)} placeholder="Consultant" className={field} />
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website" className={field} />
          <input value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="Follow-up note / date" className={field} />
          <textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Comments" rows={2} className={field} />
          <button
            onClick={() =>
              name.trim() &&
              onAdd({ name, status, consultant, website, follow_up: followUp, comments })
            }
            disabled={saving || !name.trim()}
            className="w-full border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50"
          >
            {saving ? "ADDING…" : "ADD CLIENT"}
          </button>
        </div>
      </div>
    </div>
  );
}
