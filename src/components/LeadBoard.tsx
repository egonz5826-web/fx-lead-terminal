"use client";

import { useMemo, useState } from "react";
import type { Contact, LeadWithScore } from "@/lib/types";
import LeadContactsCell from "./LeadContactsCell";

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

function statusBadge(status: string): string {
  switch (status) {
    case "Won":
      return "bg-emerald-950 text-emerald-400 border-emerald-800";
    case "Lost":
      return "bg-red-950 text-red-400 border-red-800";
    case "Qualified":
    case "Negotiating":
      return "bg-cyan-950 text-cyan-400 border-cyan-800";
    case "Contacted":
      return "bg-amber-950 text-amber-400 border-amber-800";
    default:
      return "bg-neutral-900 text-neutral-400 border-neutral-700";
  }
}

export default function LeadBoard({ leads }: { leads: LeadWithContacts[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("fx_opportunity_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...leads];
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
  }, [leads, sortKey, sortDir]);

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
        <span className="text-[10px] text-neutral-500">{leads.length} LEADS</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-neutral-400">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="cursor-pointer select-none whitespace-nowrap px-3 py-2 font-semibold hover:text-emerald-400"
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 font-semibold">Contacts</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-neutral-900 hover:bg-neutral-900/60"
              >
                <td className="whitespace-nowrap px-3 py-2 font-medium text-neutral-100">
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
                  <span
                    className={`inline-block border px-2 py-0.5 text-[10px] ${statusBadge(
                      lead.status
                    )}`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-300">
                  {lead.owner}
                </td>
                <td className="px-3 py-2">
                  <LeadContactsCell
                    leadId={lead.id}
                    companyName={lead.company_name}
                    hasWebsite={Boolean(lead.website)}
                    initialContacts={lead.contacts}
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
