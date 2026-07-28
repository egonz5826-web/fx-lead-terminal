"use client";

import { useState } from "react";
import type { OrganizationSearchResult } from "@/lib/apollo";
import type { KeywordSuggestion } from "@/lib/ai-suggest";
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

// Trade currencies for the buy/sell pair builder — build ANY pair, not a fixed set.
const CURRENCIES = [
  "USD", "MXN", "EUR", "GBP", "CAD", "CNY", "JPY", "BRL", "COP", "CLP", "ARS",
  "PEN", "INR", "AUD", "CHF", "HKD", "SGD", "KRW", "TWD", "ZAR", "AED", "SEK",
  "NOK", "PLN", "TRY", "THB", "NZD", "ILS",
];

export default function DiscoverForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const { setCreditsUsed } = useApolloUsage();

  const [location, setLocation] = useState("Texas, US");
  const [keywords, setKeywords] = useState("freight, logistics, customs broker, freight forwarding");
  const [minEmployees, setMinEmployees] = useState("10");
  const [maxEmployees, setMaxEmployees] = useState("500");
  const [page, setPage] = useState(1);

  const [corridor, setCorridor] = useState("Mexico → USA");
  const [currencies, setCurrencies] = useState<string[]>(["USD/MXN"]);
  const [buyCcy, setBuyCcy] = useState("USD");
  const [sellCcy, setSellCcy] = useState("MXN");

  function toggleCurrency(pair: string) {
    setCurrencies((prev) =>
      prev.includes(pair) ? prev.filter((c) => c !== pair) : [...prev, pair]
    );
  }

  function addPair() {
    if (buyCcy === sellCcy) return;
    const pair = `${buyCcy}/${sellCcy}`;
    setCurrencies((prev) => (prev.includes(pair) ? prev : [...prev, pair]));
  }
  const [owner, setOwner] = useState(OWNER_OPTIONS[0].value);

  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [results, setResults] = useState<OrganizationSearchResult[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  async function handleSuggest() {
    setSuggestError(null);
    setLoadingSuggest(true);
    try {
      const res = await fetch("/api/discover/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSuggestError(data.error ?? "Couldn't get suggestions.");
        return;
      }
      setSuggestions(data.suggestions ?? []);
      if ((data.suggestions ?? []).length === 0) {
        setSuggestError("No suggestions — try a broader keyword.");
      }
    } catch {
      setSuggestError("Couldn't reach the AI. Try again.");
    } finally {
      setLoadingSuggest(false);
    }
  }

  function keywordParts(kw: string): string[] {
    return kw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  }

  function hasKeyword(term: string): boolean {
    return keywordParts(keywords).some((p) => p.toLowerCase() === term.toLowerCase());
  }

  // Click a chip to add its term (and set the currency); click again to remove.
  function toggleSuggestion(s: KeywordSuggestion) {
    const present = hasKeyword(s.term);
    setKeywords((prev) => {
      const parts = keywordParts(prev);
      const idx = parts.findIndex((p) => p.toLowerCase() === s.term.toLowerCase());
      if (idx >= 0) parts.splice(idx, 1);
      else parts.push(s.term);
      return parts.join(", ");
    });
    if (!present && s.currency) {
      setCurrencies((prev) => (prev.includes(s.currency) ? prev : [...prev, s.currency]));
    }
  }

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
        body: JSON.stringify({
          companies: chosen,
          corridor,
          currencyExposure: currencies.join(", "),
          owner,
          keywords,
        }),
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

        <div className="mt-3">
          <button
            type="button"
            onClick={handleSuggest}
            disabled={loadingSuggest || keywords.trim().length < 2}
            title="AI suggests related niches with cross-border payment exposure (pennies, no Apollo credits)."
            className="border border-amber-700 bg-amber-950/30 px-3 py-1 text-[11px] font-semibold tracking-wider text-amber-400 hover:bg-amber-900/40 disabled:opacity-50"
          >
            {loadingSuggest ? "THINKING…" : "✨ AI SUGGEST RELATED NICHES"}
          </button>
          {suggestError && (
            <span className="ml-2 text-[11px] text-neutral-500">{suggestError}</span>
          )}
          {suggestions.length > 0 && (
            <>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.map((s) => {
                  const added = hasKeyword(s.term);
                  return (
                    <button
                      key={s.term}
                      type="button"
                      onClick={() => toggleSuggestion(s)}
                      title={
                        added
                          ? `Remove "${s.term}"`
                          : `Add "${s.term}" and set currency to ${s.currency}`
                      }
                      className={`border px-2 py-0.5 text-[11px] ${
                        added
                          ? "border-emerald-600 bg-emerald-900/40 text-emerald-300"
                          : "border-neutral-700 bg-black text-emerald-400 hover:border-emerald-600 hover:bg-emerald-950/30"
                      }`}
                    >
                      {added ? "✓ " : "+ "}
                      {s.term}
                      <span className="ml-1 text-[9px] uppercase tracking-wider text-neutral-500">
                        {s.currency}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[10px] text-neutral-600">
                Click to add a niche to your search (adds the term above and its currency below).
                Click again to remove.
              </p>
            </>
          )}
        </div>

        <h2 className="mb-1 mt-5 text-xs font-semibold tracking-widest text-emerald-500">
          TAG NEW LEADS AS
        </h2>
        <p className="mb-3 text-[10px] text-neutral-600">
          Both optional — leave corridor blank and pick any number of currencies (or none) if
          you&apos;re casting a wide net.
        </p>

        <div className="mb-3">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-400">
            Currency exposure — build any pair (buy / sell)
          </span>
          <div className="flex flex-wrap items-end gap-2">
            <label>
              <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-neutral-600">
                Buy
              </span>
              <select
                value={buyCcy}
                onChange={(e) => setBuyCcy(e.target.value)}
                className="border border-neutral-700 bg-black px-2 py-1.5 text-xs text-emerald-400 outline-none focus:border-emerald-600"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <span className="pb-2 text-neutral-500">/</span>
            <label>
              <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-neutral-600">
                Sell
              </span>
              <select
                value={sellCcy}
                onChange={(e) => setSellCcy(e.target.value)}
                className="border border-neutral-700 bg-black px-2 py-1.5 text-xs text-emerald-400 outline-none focus:border-emerald-600"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={addPair}
              disabled={buyCcy === sellCcy}
              className="border border-emerald-700 bg-emerald-950/40 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-40"
            >
              + ADD PAIR
            </button>
          </div>
          {currencies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {currencies.map((pair) => (
                <button
                  key={pair}
                  type="button"
                  onClick={() => toggleCurrency(pair)}
                  title={`Remove ${pair}`}
                  className="border border-emerald-600 bg-emerald-900/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-300"
                >
                  {pair} <span className="ml-1 text-neutral-500">✕</span>
                </button>
              ))}
            </div>
          )}
          <p className="mt-1 text-[10px] text-neutral-600">
            e.g. Buy USD / Sell MXN → USD/MXN. Add as many pairs as you want, or none.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Corridor (optional)"
            value={corridor}
            onChange={setCorridor}
            placeholder="leave blank for any"
          />
          {isAdmin && (
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-400">
                Assign to
              </span>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full border border-neutral-700 bg-black px-2 py-1.5 text-xs text-emerald-400 outline-none focus:border-emerald-600"
              >
                {OWNER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
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
                  <div className="flex items-center gap-2 font-medium text-neutral-100">
                    {r.name}
                    {r.intent_strength && (
                      <span className="border border-amber-700 bg-amber-950/50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-amber-400">
                        INTENT: {r.intent_strength}
                      </span>
                    )}
                  </div>
                  <div className="text-neutral-500">
                    {r.website ?? "no website"}
                    {r.phone ? ` · ${r.phone}` : ""}
                    {r.revenue_printed ? (
                      <>
                        {" · "}
                        <span className="text-amber-300">${r.revenue_printed} rev</span>
                      </>
                    ) : null}
                    {r.growth_12mo !== null ? (
                      <>
                        {" · "}
                        <span
                          className={
                            r.growth_12mo > 0
                              ? "text-emerald-400"
                              : r.growth_12mo < 0
                                ? "text-red-400"
                                : "text-neutral-500"
                          }
                        >
                          {r.growth_12mo >= 0 ? "+" : ""}
                          {(r.growth_12mo * 100).toFixed(0)}% HC yoy
                        </span>
                      </>
                    ) : null}
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
