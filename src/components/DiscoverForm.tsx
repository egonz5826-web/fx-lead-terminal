"use client";

import { useState } from "react";
import type { OrganizationSearchResult } from "@/lib/apollo";
import { OWNER_OPTIONS } from "@/lib/team";
import { useApolloUsage } from "./ApolloUsageContext";

const KEYWORD_SUGGESTIONS = [
  "freight",
  "logistics",
  "customs broker",
  "freight forwarding",
  "trucking",
  "drayage",
  "3PL",
  "supply chain",
  "import export",
  "warehousing",
  "distribution",
  "NVOCC",
  "cross-border transportation",
  "cargo",
  "manufacturing",
  "wholesale distribution",
  "agriculture",
  "produce",
  "auto parts",
  "electronics",
];

export default function DiscoverForm() {
  const { setCreditsUsed } = useApolloUsage();

  const [location, setLocation] = useState("Texas, US");
  const [keywords, setKeywords] = useState("freight, logistics, customs broker, freight forwarding");
  const [minEmployees, setMinEmployees] = useState("10");
  const [maxEmployees, setMaxEmployees] = useState("500");
  const [page, setPage] = useState(1);

  const [corridor, setCorridor] = useState("Mexico → USA");
  const [currencyExposure, setCurrencyExposure] = useState("USD/MXN");
  const [owner, setOwner] = useState(OWNER_OPTIONS[0]);

  const [results, setResults] = useState<OrganizationSearchResult[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  async function runSearch(targetPage: number) {
    setSearching(true);
    setError(null);
    setInfoMessage(null);
    setAddedMessage(null);
    setResults(null);
    setSelected(new Set());

    try {
      const res = await fetch("/api/apollo/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          keywords,
          minEmployees: minEmployees ? Number(minEmployees) : undefined,
          maxEmployees: maxEmployees ? Number(maxEmployees) : undefined,
          page: targetPage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong searching Apollo.");
        return;
      }
      setResults(data.results ?? []);
      setPage(targetPage);
      if (typeof data.creditsUsed === "number") setCreditsUsed(data.creditsUsed);
      if (data.message) {
        if ((data.results ?? []).length === 0) {
          setError(data.message);
        } else {
          setInfoMessage(data.message);
        }
      }
    } catch {
      setError("Couldn't reach Apollo. Check your connection and try again.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const confirmed = window.confirm(
      "Searching Apollo for companies uses Apollo credits per page of results (not free, unlike contact search). Continue?"
    );
    if (!confirmed) return;
    await runSearch(1);
  }

  async function handleRefresh() {
    const confirmed = window.confirm(
      "Getting a new batch of companies uses Apollo credits again. Continue?"
    );
    if (!confirmed) return;
    await runSearch(page + 1);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!results) return;
    setSelected((prev) =>
      prev.size === results.length ? new Set() : new Set(results.map((r) => r.apollo_org_id))
    );
  }

  async function handleAddSelected() {
    if (!results) return;
    const chosen = results.filter((r) => selected.has(r.apollo_org_id));
    if (chosen.length === 0) return;

    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/add-discovered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companies: chosen, corridor, currencyExposure, owner }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add leads.");
        return;
      }
      let message = `✓ Added ${data.added} companies to the lead board. Head to the terminal to see them.`;
      if (data.skippedDuplicates > 0) {
        message += ` (Skipped ${data.skippedDuplicates} already on the board.)`;
      }
      setAddedMessage(message);
      setResults((prev) => prev?.filter((r) => !selected.has(r.apollo_org_id)) ?? null);
      setSelected(new Set());
    } catch {
      setError("Couldn't save leads. Check your connection and try again.");
    } finally {
      setAdding(false);
    }
  }

  const allSelected = results !== null && results.length > 0 && selected.size === results.length;

  return (
    <div className="space-y-6">
      <datalist id="keyword-suggestions">
        {KEYWORD_SUGGESTIONS.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>

      <form onSubmit={handleSearch} className="border border-neutral-800 bg-neutral-950 p-4">
        <h2 className="mb-3 text-xs font-semibold tracking-widest text-emerald-500">
          SEARCH CRITERIA
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Location" value={location} onChange={setLocation} placeholder="Texas, US" />
          <Field
            label="Keywords / Industry"
            value={keywords}
            onChange={setKeywords}
            placeholder="freight, logistics, customs broker"
            listId="keyword-suggestions"
          />
          <Field label="Min Employees" value={minEmployees} onChange={setMinEmployees} type="number" />
          <Field label="Max Employees" value={maxEmployees} onChange={setMaxEmployees} type="number" />
        </div>

        <h2 className="mb-3 mt-5 text-xs font-semibold tracking-widest text-emerald-500">
          TAG NEW LEADS AS
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Corridor" value={corridor} onChange={setCorridor} placeholder="Mexico → USA" />
          <Field
            label="Currency Exposure"
            value={currencyExposure}
            onChange={setCurrencyExposure}
            placeholder="USD/MXN"
          />
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-400">
              Owner
            </span>
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full border border-neutral-700 bg-black px-2 py-1.5 text-xs text-emerald-400 outline-none focus:border-emerald-600"
            >
              {OWNER_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={searching}
          className="mt-4 border border-emerald-700 bg-emerald-950/40 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50"
        >
          {searching ? "SEARCHING…" : "SEARCH APOLLO (up to 50 results)"}
        </button>
      </form>

      {error && (
        <div className="border border-amber-900 bg-amber-950/20 p-3 text-xs text-amber-400">
          ⚠ {error}
        </div>
      )}
      {infoMessage && (
        <div className="border border-neutral-700 bg-neutral-900/50 p-3 text-xs text-neutral-400">
          ℹ {infoMessage}
        </div>
      )}
      {addedMessage && (
        <div className="border border-emerald-900 bg-emerald-950/20 p-3 text-xs text-emerald-400">
          {addedMessage}
        </div>
      )}

      {results && results.length > 0 && (
        <div className="border border-emerald-900 bg-neutral-950">
          <div className="flex items-center justify-between border-b border-emerald-900 px-3 py-2">
            <span className="text-[11px] font-semibold tracking-widest text-emerald-500">
              RESULTS ({results.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={searching}
                className="border border-neutral-700 px-3 py-1.5 text-[10px] font-semibold text-neutral-300 hover:border-emerald-700 hover:text-emerald-400 disabled:opacity-50"
              >
                🔄 SHOW DIFFERENT BATCH
              </button>
              <button
                onClick={handleAddSelected}
                disabled={selected.size === 0 || adding}
                className="border border-emerald-700 bg-emerald-950/40 px-3 py-1.5 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50"
              >
                {adding ? "ADDING…" : `ADD SELECTED (${selected.size})`}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2 text-[10px] text-neutral-400">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="accent-emerald-500"
            />
            <span>{allSelected ? "Deselect all" : "Select all"}</span>
          </div>
          <ul className="divide-y divide-neutral-800">
            {results.map((r) => (
              <li key={r.apollo_org_id} className="flex items-center gap-3 p-3 text-xs">
                <input
                  type="checkbox"
                  checked={selected.has(r.apollo_org_id)}
                  onChange={() => toggleSelected(r.apollo_org_id)}
                  className="accent-emerald-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-neutral-100">{r.name}</div>
                  <div className="text-neutral-500">
                    {r.website ?? "no website"}
                    {r.phone ? ` · ${r.phone}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-neutral-800 px-3 py-2 text-[10px] text-neutral-500">
            City, state, employee count, and industry are filled in automatically when you add a
            company (a quick enrichment lookup Apollo doesn't include in search results).
          </p>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  listId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  listId?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        className="w-full border border-neutral-700 bg-black px-2 py-1.5 text-xs text-emerald-400 outline-none focus:border-emerald-600"
      />
    </label>
  );
}
