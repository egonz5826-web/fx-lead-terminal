"use client";

import { useMemo, useState } from "react";
import type { Contact, LeadWithScore } from "@/lib/types";
import LeadContactsCell from "./LeadContactsCell";
import StatusDropdown from "./StatusDropdown";
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

export default function LeadBoard({ leads }: { leads: LeadWithContacts[] }) {
  const [rows, setRows] = useState(leads);
  const [sortKey, setSortKey] = useState<SortKey>("fx_opportunity_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...rows];
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
  }, [rows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function handleDiscard(leadId: string) {
    setRows((prev) => prev.filter((l) => l.id !== leadId));
  }

  return (
    <div className="border border-emerald-900 bg-neutral-950">
      <div className="flex items-center justify-between border-b border-emerald-900 px-3 py-2">
        <span className="text-[11px] font-semibold tracking-widest text-emerald-500">
          LEAD BOARD
        </span>
        <span className="text-[10px] text-neutral-500">{rows.length} LEADS</span>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[1400px] border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-neutral-950">
            <tr className="border-b border-neutral-800 text-left text-neutral-400">
              {COLUMNS.map((col, i) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 font-semibold hover:text-emerald-400 ${
                    i === 0 ? "sticky left-0 z-30 bg-neutral-950" : ""
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
                <td className="sticky left-0 z-10 whitespace-nowrap bg-neutral-950 px-3 py-2 font-medium text-neutral-100">
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
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-300">
                  {lead.owner}
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
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
