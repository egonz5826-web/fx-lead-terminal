"use client";

import { useMemo, useState } from "react";
import type { Contact, LeadStatus, LeadWithScore } from "@/lib/types";
import { LEAD_STATUSES } from "@/lib/types";
import { OWNER_OPTIONS } from "@/lib/team";
import LeadContactsCell from "./LeadContactsCell";
import StatusDropdown from "./StatusDropdown";
import OwnerDropdown from "./OwnerDropdown";
import NotesFollowUp from "./NotesFollowUp";

export type LeadWithContacts = LeadWithScore & {
  contacts: Contact[];
  isExistingClient: boolean;
};

type SortKey =
  | "company_name"
  | "city"
  | "import_corridors"
  | "est_annual_teu"
  | "currency_exposure"
  | "fx_opportunity_score"
  | "latest_signal"
  | "status"
  | "owner";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "company_name", label: "Company" },
  { key: "city", label: "City / State" },
  { key: "import_corridors", label: "Corridors" },
  { key: "est_annual_teu", label: "Est. Annual TEU" },
  { key: "currency_exposure", label: "Currency Exposure" },
  { key: "fx_opportunity_score", label: "FX Score" },
  { key: "latest_signal", label: "Latest Signal" },
  { key: "status", label: "Status" },
  { key: "owner", label: "Owner" },
];

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LeadBoard({ leads }: { leads: LeadWithContacts[] }) {
  const [rows, setRows] = useState(leads);
  const [sortKey, setSortKey] = useState<SortKey>("fx_opportunity_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "All">("All");
  const [ownerFilter, setOwnerFilter] = useState<string>("All");
  const [dueOnly, setDueOnly] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOwner, setBulkOwner] = useState(OWNER_OPTIONS[0]);
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const owners = useMemo(
    () => Array.from(new Set(rows.map((r) => r.owner).filter(Boolean))).sort(),
    [rows]
  );

  const dueCount = useMemo(() => {
    const today = todayStr();
    return rows.filter((r) => r.follow_up_date && r.follow_up_date <= today).length;
  }, [rows]);

  function handleDiscard(leadId: string) {
    setRows((prev) => prev.filter((l) => l.id !== leadId));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(leadId);
      return next;
    });
  }

  function handleStatusChange(leadId: string, status: LeadStatus) {
    setRows((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
  }

  function handleOwnerChange(leadId: string, owner: string) {
    setRows((prev) => prev.map((l) => (l.id === leadId ? { ...l, owner } : l)));
  }

  function handleFollowUpDateChange(leadId: string, date: string | null) {
    setRows((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, follow_up_date: date } : l))
    );
  }

  function toggleSelected(leadId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }

  async function handleBulkAssign() {
    if (selected.size === 0) return;
    setBulkAssigning(true);
    try {
      const leadIds = Array.from(selected);
      const res = await fetch("/api/leads/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds, owner: bulkOwner }),
      });
      if (res.ok) {
        setRows((prev) =>
          prev.map((l) => (selected.has(l.id) ? { ...l, owner: bulkOwner } : l))
        );
        setSelected(new Set());
      }
    } finally {
      setBulkAssigning(false);
    }
  }

  const filtered = useMemo(() => {
    const today = todayStr();
    const query = searchText.trim().toLowerCase();
    return rows.filter((lead) => {
      if (statusFilter !== "All" && lead.status !== statusFilter) return false;
      if (ownerFilter !== "All" && lead.owner !== ownerFilter) return false;
      if (dueOnly && !(lead.follow_up_date && lead.follow_up_date <= today)) return false;
      if (query) {
        const haystack = `${lead.company_name} ${lead.city} ${lead.state} ${lead.owner}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [rows, searchText, statusFilter, ownerFilter, dueOnly]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey as keyof LeadWithScore];
      const bv = b[sortKey as keyof LeadWithScore];
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const allVisibleSelected =
    sorted.length > 0 && sorted.every((l) => selected.has(l.id));

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        sorted.forEach((l) => next.delete(l.id));
        return next;
      }
      const next = new Set(prev);
      sorted.forEach((l) => next.add(l.id));
      return next;
    });
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="border border-emerald-900 bg-neutral-950">
      <div className="flex items-center justify-between border-b border-emerald-900 px-3 py-2">
        <span className="text-[11px] font-semibold tracking-widest text-emerald-500">
          LEAD BOARD
        </span>
        <span className="text-[10px] text-neutral-500">
          {sorted.length} / {rows.length} LEADS
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 px-3 py-2">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search company, city, owner…"
          className="w-52 border border-neutral-700 bg-black px-2 py-1 text-[11px] text-emerald-400 outline-none focus:border-emerald-600"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "All")}
          className="border border-neutral-700 bg-black px-2 py-1 text-[11px] text-neutral-300 outline-none focus:border-emerald-600"
        >
          <option value="All">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="border border-neutral-700 bg-black px-2 py-1 text-[11px] text-neutral-300 outline-none focus:border-emerald-600"
        >
          <option value="All">All owners</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <button
          onClick={() => setDueOnly((d) => !d)}
          className={`border px-2 py-1 text-[11px] font-semibold ${
            dueOnly
              ? "border-amber-600 bg-amber-950/40 text-amber-400"
              : "border-neutral-700 text-neutral-300 hover:border-amber-700 hover:text-amber-400"
          }`}
        >
          {dueCount} follow-up{dueCount === 1 ? "" : "s"} due
        </button>
        {(searchText || statusFilter !== "All" || ownerFilter !== "All" || dueOnly) && (
          <button
            onClick={() => {
              setSearchText("");
              setStatusFilter("All");
              setOwnerFilter("All");
              setDueOnly(false);
            }}
            className="text-[11px] text-neutral-500 hover:text-neutral-300"
          >
            clear filters
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-emerald-900 bg-emerald-950/20 px-3 py-2">
          <span className="text-[11px] font-semibold text-emerald-400">
            {selected.size} selected
          </span>
          <span className="text-[11px] text-neutral-400">Assign owner:</span>
          <select
            value={bulkOwner}
            onChange={(e) => setBulkOwner(e.target.value)}
            className="border border-neutral-700 bg-black px-2 py-1 text-[11px] text-neutral-300 outline-none focus:border-emerald-600"
          >
            {OWNER_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkAssign}
            disabled={bulkAssigning}
            className="border border-emerald-700 bg-emerald-950/40 px-3 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50"
          >
            {bulkAssigning ? "APPLYING…" : "APPLY"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-[11px] text-neutral-500 hover:text-neutral-300"
          >
            clear selection
          </button>
        </div>
      )}

      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[1450px] border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-neutral-950">
            <tr className="border-b border-neutral-800 text-left text-neutral-400">
              <th className="sticky left-0 z-30 w-8 bg-neutral-950 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  className="accent-emerald-500"
                />
              </th>
              {COLUMNS.map((col, i) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 font-semibold hover:text-emerald-400 ${
                    i === 0 ? "sticky left-8 z-30 bg-neutral-950" : ""
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 font-semibold">Phone</th>
              <th className="whitespace-nowrap px-3 py-2 font-semibold">Contacts</th>
              <th className="whitespace-nowrap px-3 py-2 font-semibold">Notes / Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-neutral-900 hover:bg-neutral-900/60"
              >
                <td className="sticky left-0 z-10 w-8 bg-neutral-950 px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggleSelected(lead.id)}
                    className="accent-emerald-500"
                  />
                </td>
                <td className="sticky left-8 z-10 whitespace-nowrap bg-neutral-950 px-3 py-2 font-medium text-neutral-100">
                  {lead.company_name}
                  {lead.isExistingClient && (
                    <span
                      className="ml-2 inline-block border border-red-800 bg-red-950 px-1.5 py-0.5 text-[9px] font-semibold text-red-400"
                      title="Matches an account in your imported Salesforce client list"
                    >
                      EXISTING CLIENT
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-300">
                  {lead.city}, {lead.state}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-300">
                  {lead.import_corridors}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-300">
                  {lead.est_annual_teu.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-300">
                  {lead.currency_exposure}
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-2 font-semibold ${scoreColor(
                    lead.fx_opportunity_score
                  )}`}
                >
                  {lead.fx_opportunity_score}
                </td>
                <td className="max-w-[220px] truncate px-3 py-2 text-neutral-300">
                  {lead.latest_signal}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <StatusDropdown
                    leadId={lead.id}
                    companyName={lead.company_name}
                    status={lead.status}
                    onDiscard={handleDiscard}
                    onStatusChange={handleStatusChange}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <OwnerDropdown
                    leadId={lead.id}
                    owner={lead.owner}
                    onOwnerChange={handleOwnerChange}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-300">
                  {lead.phone ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <LeadContactsCell
                    leadId={lead.id}
                    companyName={lead.company_name}
                    hasWebsite={Boolean(lead.website)}
                    initialContacts={lead.contacts}
                  />
                </td>
                <td className="px-3 py-2">
                  <NotesFollowUp
                    leadId={lead.id}
                    notes={lead.notes}
                    followUpDate={lead.follow_up_date}
                    onFollowUpDateChange={handleFollowUpDateChange}
                  />
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={13} className="px-3 py-6 text-center text-neutral-500">
                  No leads match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
