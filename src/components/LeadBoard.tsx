"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Contact, LeadPhone, LeadStatus, LeadWithScore } from "@/lib/types";
import type { FxPair } from "@/lib/fx";
import { LEAD_STATUSES, CLAIMING_STATUSES, HIDDEN_STATUS } from "@/lib/types";
import { OWNER_OPTIONS, UNASSIGNED, ownerLabel } from "@/lib/team";
import LeadContactsCell from "./LeadContactsCell";
import StatusDropdown from "./StatusDropdown";
import OwnerDropdown from "./OwnerDropdown";
import NotesFollowUp from "./NotesFollowUp";
import ScoreBar from "./ScoreBar";
import OutreachButton from "./OutreachButton";

export type LeadWithContacts = LeadWithScore & {
  contacts: Contact[];
  extraPhones: LeadPhone[];
  isExistingClient: boolean;
};

type Tab = "public" | "mine" | "all";

type SortKey =
  | "company_name"
  | "city"
  | "import_corridors"
  | "est_annual_teu"
  | "currency_exposure"
  | "fx_opportunity_score"
  | "ai_score"
  | "latest_signal"
  | "status"
  | "owner"
  | "created_at";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "company_name", label: "Company" },
  { key: "city", label: "City / State" },
  { key: "import_corridors", label: "Corridors" },
  { key: "est_annual_teu", label: "Est. Annual TEU" },
  { key: "currency_exposure", label: "Currency Exposure" },
  { key: "fx_opportunity_score", label: "FX Score" },
  { key: "ai_score", label: "AI Analyst" },
  { key: "latest_signal", label: "Latest Signal" },
  { key: "status", label: "Status" },
  { key: "owner", label: "Owner" },
];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LeadBoard({
  leads,
  isAdmin = false,
  currentUser,
  fxPairs = [],
  hotPairs = {},
}: {
  leads: LeadWithContacts[];
  isAdmin?: boolean;
  currentUser: string;
  fxPairs?: FxPair[];
  hotPairs?: Record<string, number>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(leads);
  const [tab, setTab] = useState<Tab>(isAdmin ? "all" : "public");
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [seamlessId, setSeamlessId] = useState<string | null>(null);
  const [seamlessMsg, setSeamlessMsg] = useState<Record<string, string>>({});

  // Sync to fresh server data when AutoRefresh (or any navigation) re-runs the
  // page — without this, the board keeps its first snapshot and needs a manual
  // reload to reflect teammates' changes or newly discovered leads.
  useEffect(() => {
    setRows(leads);
  }, [leads]);
  const [sortKey, setSortKey] = useState<SortKey>("fx_opportunity_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [aiRunning, setAiRunning] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "All">("All");
  const [ownerFilter, setOwnerFilter] = useState<string>("All");
  const [currencyFilter, setCurrencyFilter] = useState("All");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [dueOnly, setDueOnly] = useState(false);
  const [discoveriesOnly, setDiscoveriesOnly] = useState(false);
  const [hotOnly, setHotOnly] = useState(false);

  // A lead is "hot" when one of its currency pairs moved sharply today — a
  // timely reason to call. Returns the biggest such move, or null.
  function leadHotMove(cur: string | null): number | null {
    if (!cur) return null;
    let best: number | null = null;
    for (const p of cur.split(",").map((s) => s.trim())) {
      const mv = hotPairs[p];
      if (mv !== undefined && (best === null || Math.abs(mv) > Math.abs(best))) best = mv;
    }
    return best;
  }

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOwner, setBulkOwner] = useState(OWNER_OPTIONS[0].value);
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const owners = useMemo(
    () => Array.from(new Set(rows.map((r) => r.owner).filter(Boolean))).sort(),
    [rows]
  );
  // A lead can carry several currency pairs (comma-separated); list the
  // individual pairs so the filter matches any lead that includes it.
  const currencies = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      for (const c of (r.currency_exposure ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)) {
        set.add(c);
      }
    }
    return Array.from(set).sort();
  }, [rows]);
  const industries = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.industry).filter((x): x is string => Boolean(x)))
      ).sort(),
    [rows]
  );

  const dueCount = useMemo(() => {
    const today = todayStr();
    return rows.filter((r) => r.follow_up_date && r.follow_up_date <= today).length;
  }, [rows]);

  const hotCount = useMemo(
    () => rows.filter((r) => leadHotMove(r.currency_exposure) !== null).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, hotPairs]
  );
  const sortedFx = useMemo(
    () => [...fxPairs].sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0)),
    [fxPairs]
  );

  const publicCount = useMemo(
    () =>
      rows.filter((r) => r.owner === UNASSIGNED && r.status !== HIDDEN_STATUS).length,
    [rows]
  );
  const mineCount = useMemo(
    () => rows.filter((r) => r.owner === currentUser).length,
    [rows, currentUser]
  );

  function handleDiscard(leadId: string) {
    setRows((prev) => prev.filter((l) => l.id !== leadId));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(leadId);
      return next;
    });
  }

  function handleStatusChange(leadId: string, status: LeadStatus) {
    // Mirror the server's claim rule so the row moves between Public / My Leads
    // immediately (claiming statuses pull it private; others release it).
    const claims = (CLAIMING_STATUSES as string[]).includes(status);
    setRows((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              status,
              owner: claims ? currentUser : UNASSIGNED,
              claimed_at: claims
                ? l.owner === currentUser && l.claimed_at
                  ? l.claimed_at
                  : new Date().toISOString()
                : null,
            }
          : l
      )
    );
  }

  async function handleSeamless(leadId: string) {
    setSeamlessId(leadId);
    setSeamlessMsg((m) => ({ ...m, [leadId]: "" }));
    try {
      const res = await fetch("/api/seamless/cross-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.phones)) {
          setRows((prev) =>
            prev.map((l) => (l.id === leadId ? { ...l, extraPhones: data.phones } : l))
          );
        }
        setSeamlessMsg((m) => ({ ...m, [leadId]: data.message ?? "" }));
      } else {
        setSeamlessMsg((m) => ({ ...m, [leadId]: data.error ?? "Failed." }));
      }
    } catch {
      setSeamlessMsg((m) => ({ ...m, [leadId]: "Couldn't reach Seamless." }));
    } finally {
      setSeamlessId(null);
    }
  }

  async function handlePick(leadId: string) {
    setPickingId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: true }),
      });
      if (res.ok) {
        setRows((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? { ...l, owner: currentUser, claimed_at: new Date().toISOString() }
              : l
          )
        );
      }
    } finally {
      setPickingId(null);
    }
  }

  function handleOwnerChange(leadId: string, owner: string) {
    setRows((prev) => prev.map((l) => (l.id === leadId ? { ...l, owner } : l)));
  }

  function handleFollowUpDateChange(leadId: string, date: string | null) {
    setRows((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, follow_up_date: date } : l))
    );
  }

  function handleContactsChange(leadId: string, contacts: Contact[]) {
    setRows((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, contacts } : lead))
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

  // Walk the whole board in batches, scoring each lead with the AI analyst,
  // then refresh so the new scores render. Admin only.
  async function handleRunAiAnalyst() {
    if (aiRunning) return;
    setAiRunning(true);
    setAiStatus("Starting AI analyst…");
    try {
      let offset = 0;
      let totalUpdated = 0;
      let totalFailed = 0;
      // Safety cap so a bug can't loop forever.
      for (let batch = 0; batch < 200; batch++) {
        const res = await fetch("/api/leads/ai-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 20, offset }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAiStatus(`Stopped: ${data.error ?? "AI scoring failed."}`);
          return;
        }
        totalUpdated += data.updated ?? 0;
        totalFailed += data.failed ?? 0;
        offset += data.processed ?? 0;
        setAiStatus(`Scored ${totalUpdated} leads… (${data.remaining} left)`);
        if (!data.remaining || data.processed === 0) break;
      }
      setAiStatus(
        `Done — scored ${totalUpdated} lead${totalUpdated === 1 ? "" : "s"}${
          totalFailed ? `, ${totalFailed} failed` : ""
        }. Refreshing…`
      );
      router.refresh();
    } catch {
      setAiStatus("Couldn't reach the server. Try again.");
    } finally {
      setAiRunning(false);
    }
  }

  const filtered = useMemo(() => {
    const today = todayStr();
    const query = searchText.trim().toLowerCase();
    return rows.filter((lead) => {
      // Tab scope: Public = unclaimed & not consultant-taken; My Leads = mine;
      // All (admin) = everything.
      if (tab === "public") {
        if (lead.owner !== UNASSIGNED || lead.status === HIDDEN_STATUS) return false;
      } else if (tab === "mine") {
        if (lead.owner !== currentUser) return false;
      }
      if (statusFilter !== "All" && lead.status !== statusFilter) return false;
      if (ownerFilter !== "All" && lead.owner !== ownerFilter) return false;
      if (
        currencyFilter !== "All" &&
        !(lead.currency_exposure ?? "")
          .split(",")
          .map((s) => s.trim())
          .includes(currencyFilter)
      )
        return false;
      if (industryFilter !== "All" && (lead.industry ?? "") !== industryFilter) return false;
      if (discoveriesOnly && lead.discovered_by !== currentUser) return false;
      if (hotOnly && leadHotMove(lead.currency_exposure) === null) return false;
      if (dueOnly && !(lead.follow_up_date && lead.follow_up_date <= today)) return false;
      if (query) {
        const haystack =
          `${lead.company_name} ${lead.city} ${lead.state} ${lead.owner} ${lead.industry ?? ""} ${lead.search_keywords ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [
    rows,
    searchText,
    statusFilter,
    ownerFilter,
    currencyFilter,
    industryFilter,
    discoveriesOnly,
    hotOnly,
    dueOnly,
    tab,
    currentUser,
  ]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey as keyof LeadWithScore];
      const bv = b[sortKey as keyof LeadWithScore];
      // Unscored leads (null, e.g. ai_score before a run) always sink to the
      // bottom regardless of sort direction.
      const aNull = av === null || av === undefined;
      const bNull = bv === null || bv === undefined;
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
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

      <div className="flex items-center gap-1 border-b border-neutral-800 px-3 py-2">
        {(
          [
            { key: "public" as Tab, label: "🌐 Public Pool", count: publicCount },
            { key: "mine" as Tab, label: "🔒 My Leads", count: mineCount },
            ...(isAdmin
              ? [{ key: "all" as Tab, label: "All Leads", count: rows.length }]
              : []),
          ]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border px-3 py-1 text-[11px] font-semibold tracking-wider ${
              tab === t.key
                ? "border-emerald-600 bg-emerald-950/40 text-emerald-400"
                : "border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
            }`}
          >
            {t.label} <span className="ml-1 text-neutral-500">{t.count}</span>
          </button>
        ))}
        {tab === "public" && (
          <span className="ml-2 text-[10px] text-neutral-600">
            Up for grabs — click Pick to claim a lead (yours for 15 days).
          </span>
        )}
      </div>

      {fxPairs.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-neutral-800 bg-black/40 px-3 py-2 text-[11px]">
          <span className="font-semibold tracking-wider text-amber-400">🔥 VOLATILITY DESK</span>
          {sortedFx.map((p) => {
            const isHot = hotPairs[p.pair] !== undefined;
            const up = (p.changePct ?? 0) >= 0;
            const exposed = isHot
              ? rows.filter((r) =>
                  (r.currency_exposure ?? "")
                    .split(",")
                    .map((s) => s.trim())
                    .includes(p.pair)
                ).length
              : 0;
            return (
              <span key={p.pair} className={isHot ? "text-neutral-100" : "text-neutral-500"}>
                <span className="tabular font-semibold">{p.pair}</span>{" "}
                {p.changePct !== null ? (
                  <span className={up ? "text-emerald-400" : "text-red-400"}>
                    {up ? "▲" : "▼"}
                    {Math.abs(p.changePct)}%
                  </span>
                ) : (
                  <span className="text-neutral-600">—</span>
                )}
                {isHot && exposed > 0 && (
                  <span className="ml-1 text-amber-400">· {exposed} leads</span>
                )}
              </span>
            );
          })}
          {Object.keys(hotPairs).length === 0 && (
            <span className="text-[10px] text-neutral-600">
              Quiet market — no sharp moves to act on today.
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 px-3 py-2">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search company, city, industry, keywords…"
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
        {isAdmin && (
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="border border-neutral-700 bg-black px-2 py-1 text-[11px] text-neutral-300 outline-none focus:border-emerald-600"
          >
            <option value="All">All owners</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {ownerLabel(o)}
              </option>
            ))}
          </select>
        )}
        <select
          value={currencyFilter}
          onChange={(e) => setCurrencyFilter(e.target.value)}
          className="border border-neutral-700 bg-black px-2 py-1 text-[11px] text-neutral-300 outline-none focus:border-emerald-600"
        >
          <option value="All">All currencies</option>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {industries.length > 0 && (
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="max-w-[160px] border border-neutral-700 bg-black px-2 py-1 text-[11px] text-neutral-300 outline-none focus:border-emerald-600"
          >
            <option value="All">All industries</option>
            {industries.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => setDiscoveriesOnly((d) => !d)}
          title="Show only leads you discovered via the Discover tab."
          className={`border px-2 py-1 text-[11px] font-semibold ${
            discoveriesOnly
              ? "border-emerald-600 bg-emerald-950/40 text-emerald-400"
              : "border-neutral-700 text-neutral-300 hover:border-emerald-700 hover:text-emerald-400"
          }`}
        >
          🔍 My discoveries
        </button>
        {hotCount > 0 && (
          <button
            onClick={() => setHotOnly((h) => !h)}
            title="Show only leads whose currency moved sharply today — call while the pitch is hot."
            className={`border px-2 py-1 text-[11px] font-semibold ${
              hotOnly
                ? "border-amber-600 bg-amber-950/40 text-amber-400"
                : "border-neutral-700 text-neutral-300 hover:border-amber-700 hover:text-amber-400"
            }`}
          >
            🔥 Movers only ({hotCount})
          </button>
        )}
        <button
          onClick={() => {
            setSortKey("created_at");
            setSortDir("desc");
          }}
          title="Sort newest-added first."
          className={`border px-2 py-1 text-[11px] font-semibold ${
            sortKey === "created_at"
              ? "border-emerald-600 bg-emerald-950/40 text-emerald-400"
              : "border-neutral-700 text-neutral-300 hover:border-emerald-700 hover:text-emerald-400"
          }`}
        >
          🆕 Newest
        </button>
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
        {(searchText ||
          statusFilter !== "All" ||
          ownerFilter !== "All" ||
          currencyFilter !== "All" ||
          industryFilter !== "All" ||
          discoveriesOnly ||
          hotOnly ||
          dueOnly) && (
          <button
            onClick={() => {
              setSearchText("");
              setStatusFilter("All");
              setOwnerFilter("All");
              setCurrencyFilter("All");
              setIndustryFilter("All");
              setDiscoveriesOnly(false);
              setHotOnly(false);
              setDueOnly(false);
            }}
            className="text-[11px] text-neutral-500 hover:text-neutral-300"
          >
            clear filters
          </button>
        )}
        {isAdmin && (
          <div className="ml-auto flex items-center gap-2">
            {aiStatus && (
              <span className="text-[11px] text-neutral-400">{aiStatus}</span>
            )}
            <button
              onClick={handleRunAiAnalyst}
              disabled={aiRunning}
              title="Score every lead with the AI analyst (Claude Haiku). Pennies per lead, no Apollo credits."
              className="border border-amber-700 bg-amber-950/30 px-3 py-1 text-[11px] font-semibold tracking-wider text-amber-400 hover:bg-amber-900/40 disabled:opacity-50"
            >
              {aiRunning ? "SCORING…" : "⚡ RUN AI ANALYST"}
            </button>
          </div>
        )}
      </div>

      {isAdmin && selected.size > 0 && (
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
              <option key={o.value} value={o.value}>
                {o.label}
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
        <table className="zebra w-full min-w-[1450px] border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-neutral-950">
            <tr className="border-b border-neutral-800 text-left text-neutral-500">
              {isAdmin && (
                <th className="sticky left-0 z-30 w-8 bg-neutral-950 px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="accent-amber-400"
                  />
                </th>
              )}
              {COLUMNS.map((col, i) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`cursor-pointer select-none whitespace-nowrap px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider hover:text-amber-400 ${
                    i === 0
                      ? `sticky z-30 bg-neutral-950 ${isAdmin ? "left-8" : "left-0"}`
                      : ""
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 text-amber-400">
                      {sortDir === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
                Phone
              </th>
              <th className="whitespace-nowrap px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
                Contacts
              </th>
              <th className="whitespace-nowrap px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
                Notes / Follow-up
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-neutral-900 hover:bg-neutral-900/60"
              >
                {isAdmin && (
                  <td className="sticky-cell sticky left-0 z-10 w-8 px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleSelected(lead.id)}
                      className="accent-amber-400"
                    />
                  </td>
                )}
                <td
                  className={`sticky-cell sticky z-10 whitespace-nowrap px-3 py-1.5 font-medium text-neutral-100 ${
                    isAdmin ? "left-8" : "left-0"
                  }`}
                >
                  {lead.company_name}
                  {(() => {
                    const mv = leadHotMove(lead.currency_exposure);
                    return mv !== null ? (
                      <span
                        title={`${lead.currency_exposure} moved ${mv >= 0 ? "+" : ""}${mv}% today — timely to call`}
                        className="ml-2 whitespace-nowrap border border-amber-700 bg-amber-950/50 px-1 py-0.5 text-[9px] font-semibold text-amber-400"
                      >
                        🔥 {mv >= 0 ? "+" : ""}
                        {mv}%
                      </span>
                    ) : null;
                  })()}
                  <a
                    href={`https://www.importyeti.com/search?q=${encodeURIComponent(lead.company_name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="US customs import records (ImportYeti) — real shipment history, suppliers, and origin countries"
                    className="ml-2 text-[9px] font-semibold tracking-wider text-neutral-600 hover:text-amber-400"
                  >
                    IMP↗
                  </a>
                  {lead.isExistingClient && (
                    <span
                      className="ml-2 inline-block border border-red-800 bg-red-950 px-1.5 py-0.5 text-[9px] font-semibold text-red-400"
                      title="Matches an account in your imported Salesforce client list"
                    >
                      EXISTING CLIENT
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-neutral-400">
                  {lead.city}, {lead.state}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-neutral-400">
                  {lead.import_corridors}
                </td>
                <td className="tabular whitespace-nowrap px-3 py-1.5 text-amber-300">
                  {lead.est_annual_teu.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-neutral-400">
                  {lead.currency_exposure}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5">
                  <ScoreBar score={lead.fx_opportunity_score} />
                </td>
                <td className="max-w-[260px] px-3 py-1.5">
                  {lead.ai_score != null ? (
                    <div className="flex items-start gap-2">
                      <span className="tabular shrink-0 border border-amber-800 bg-amber-950/40 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300">
                        {lead.ai_score}
                      </span>
                      {lead.ai_rationale && (
                        <span className="whitespace-normal break-words text-[11px] leading-snug text-neutral-400">
                          {lead.ai_rationale}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-neutral-600">—</span>
                  )}
                  <OutreachButton leadId={lead.id} companyName={lead.company_name} />
                </td>
                <td className="max-w-[220px] whitespace-normal break-words px-3 py-1.5 align-top text-neutral-400">
                  {lead.latest_signal}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5">
                  <StatusDropdown
                    leadId={lead.id}
                    companyName={lead.company_name}
                    status={lead.status}
                    onDiscard={handleDiscard}
                    onStatusChange={handleStatusChange}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-1.5">
                  {isAdmin ? (
                    <OwnerDropdown
                      leadId={lead.id}
                      owner={lead.owner}
                      onOwnerChange={handleOwnerChange}
                    />
                  ) : lead.owner === UNASSIGNED ? (
                    <button
                      onClick={() => handlePick(lead.id)}
                      disabled={pickingId === lead.id}
                      title="Claim this lead into your My Leads tab (yours for 15 days)."
                      className="border border-emerald-700 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50"
                    >
                      {pickingId === lead.id ? "…" : "⊕ PICK"}
                    </button>
                  ) : (
                    <span className="text-emerald-400">{ownerLabel(lead.owner)}</span>
                  )}
                </td>
                <td className="tabular px-3 py-1.5 text-amber-300">
                  <PhoneList primary={lead.phone} extras={lead.extraPhones} />
                  {lead.contacts.length > 0 && (
                    <button
                      onClick={() => handleSeamless(lead.id)}
                      disabled={seamlessId === lead.id}
                      title="Cross-check phone numbers with Seamless.AI (uses Seamless credits)."
                      className="mt-1 block text-[9px] font-semibold uppercase tracking-wider text-neutral-500 hover:text-emerald-400 disabled:opacity-50"
                    >
                      {seamlessId === lead.id ? "checking…" : "⊕ seamless"}
                    </button>
                  )}
                  {seamlessMsg[lead.id] && (
                    <div className="mt-0.5 max-w-[150px] text-[9px] leading-tight text-neutral-500">
                      {seamlessMsg[lead.id]}
                    </div>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <LeadContactsCell
                    leadId={lead.id}
                    companyName={lead.company_name}
                    hasWebsite={Boolean(lead.website)}
                    initialContacts={lead.contacts}
                    onContactsChange={handleContactsChange}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <NotesFollowUp
                    leadId={lead.id}
                    companyName={lead.company_name}
                    notes={lead.notes}
                    followUpDate={lead.follow_up_date}
                    status={lead.status}
                    owner={lead.owner}
                    onFollowUpDateChange={handleFollowUpDateChange}
                  />
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 14 : 13} className="px-3 py-6 text-center text-neutral-500">
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

// Shows every distinct phone number for a lead. Apollo's number is the primary;
// extras come from other sources (ZoomInfo, Seamless) and are tagged so a rep
// knows where each came from when they differ.
function PhoneList({
  primary,
  extras,
}: {
  primary: string | null;
  extras?: LeadPhone[];
}) {
  const seen = new Set<string>();
  const norm = (p: string) => {
    const d = p.replace(/[^\d]/g, "");
    return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  };
  const items: { phone: string; source: string }[] = [];

  if (primary) {
    seen.add(norm(primary));
    items.push({ phone: primary, source: "apollo" });
  }
  for (const e of extras ?? []) {
    const key = norm(e.phone);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ phone: e.phone, source: e.source });
  }

  if (items.length === 0) return <span className="text-neutral-600">—</span>;

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((it) => (
        <span key={it.phone} className="whitespace-nowrap">
          {it.phone}
          <span className="ml-1 text-[9px] uppercase tracking-wider text-neutral-600">
            {it.source}
          </span>
        </span>
      ))}
    </div>
  );
}
