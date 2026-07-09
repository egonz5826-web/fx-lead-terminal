"use client";

import { useState } from "react";
import type { OrganizationSearchResult, PeopleLookupResult } from "@/lib/apollo";
import { useApolloUsage } from "./ApolloUsageContext";

// Two targeted lookups that sit under the broad Discover search:
//  1) look up ONE specific company by name (and add it to the pool)
//  2) look up a specific PERSON by name (free — title, company, LinkedIn)
export default function DiscoverLookups() {
  return (
    <div className="space-y-6">
      <CompanyLookup />
      <PeopleLookup />
    </div>
  );
}

function CompanyLookup() {
  const { setCreditsUsed } = useApolloUsage();
  const [name, setName] = useState("");
  const [corridor, setCorridor] = useState("Mexico → USA");
  const [currency, setCurrency] = useState("USD/MXN");
  const [results, setResults] = useState<OrganizationSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    if (!window.confirm("Looking up a company uses Apollo search credits. Continue?")) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setAddedIds(new Set());
    try {
      const res = await fetch("/api/apollo/company-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Lookup failed.");
        return;
      }
      setResults(data.results ?? []);
      if (typeof data.creditsUsed === "number") setCreditsUsed(data.creditsUsed);
    } catch {
      setError("Couldn't reach Apollo. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(org: OrganizationSearchResult) {
    setAddingId(org.apollo_org_id);
    setError(null);
    try {
      const res = await fetch("/api/leads/add-discovered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companies: [org],
          corridor,
          currencyExposure: currency,
          keywords: `company lookup: ${name}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't add.");
        return;
      }
      setAddedIds((prev) => new Set(prev).add(org.apollo_org_id));
    } catch {
      setError("Couldn't add the lead. Try again.");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <section className="border border-neutral-800 bg-neutral-950 p-4">
      <h2 className="mb-1 text-xs font-semibold tracking-widest text-emerald-500">
        LOOK UP A SPECIFIC COMPANY
      </h2>
      <p className="mb-3 text-[10px] text-neutral-500">
        Already have a company in mind? Find it and drop it straight into the public pool.
      </p>
      <form onSubmit={handleLookup} className="flex flex-wrap items-end gap-2">
        <label className="flex-1 min-w-[200px]">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-400">
            Company name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Patriot Freight Group"
            className="w-full border border-neutral-700 bg-black px-2 py-1.5 text-xs text-emerald-400 outline-none focus:border-emerald-600"
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-400">
            Corridor
          </span>
          <input
            value={corridor}
            onChange={(e) => setCorridor(e.target.value)}
            className="w-32 border border-neutral-700 bg-black px-2 py-1.5 text-xs text-emerald-400 outline-none focus:border-emerald-600"
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-400">
            Currency
          </span>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-24 border border-neutral-700 bg-black px-2 py-1.5 text-xs text-emerald-400 outline-none focus:border-emerald-600"
          />
        </label>
        <button
          type="submit"
          disabled={loading || name.trim().length < 2}
          className="border border-emerald-700 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50"
        >
          {loading ? "LOOKING UP…" : "LOOK UP"}
        </button>
      </form>

      {error && <p className="mt-2 text-[11px] text-amber-400">⚠ {error}</p>}

      {results && (
        <ul className="mt-3 divide-y divide-neutral-800 border border-neutral-800">
          {results.length === 0 && (
            <li className="p-3 text-xs text-neutral-500">No company matched that name.</li>
          )}
          {results.map((r) => (
            <li key={r.apollo_org_id} className="flex items-center gap-3 p-3 text-xs">
              <div className="flex-1">
                <div className="font-medium text-neutral-100">{r.name}</div>
                <div className="text-neutral-500">
                  {r.website ?? "no website"}
                  {r.phone ? ` · ${r.phone}` : ""}
                  {r.revenue_printed ? ` · $${r.revenue_printed} rev` : ""}
                </div>
              </div>
              {addedIds.has(r.apollo_org_id) ? (
                <span className="text-[11px] font-semibold text-emerald-400">✓ Added</span>
              ) : (
                <button
                  onClick={() => handleAdd(r)}
                  disabled={addingId === r.apollo_org_id}
                  className="border border-emerald-700 bg-emerald-950/40 px-2 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50"
                >
                  {addingId === r.apollo_org_id ? "ADDING…" : "+ Add to pool"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PeopleLookup() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [results, setResults] = useState<PeopleLookupResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2 && company.trim().length < 2) return;

    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/apollo/people-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Search failed.");
        return;
      }
      setResults(data.results ?? []);
    } catch {
      setError("Couldn't reach Apollo. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border border-neutral-800 bg-neutral-950 p-4">
      <h2 className="mb-1 text-xs font-semibold tracking-widest text-emerald-500">
        LOOK UP A PERSON
      </h2>
      <p className="mb-3 text-[10px] text-neutral-500">
        Free search — returns title, company, and LinkedIn. To reveal email/phone, add their
        company as a lead and use Find Contacts.
      </p>
      <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-2">
        <label className="flex-1 min-w-[160px]">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-400">
            Person name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jane Doe"
            className="w-full border border-neutral-700 bg-black px-2 py-1.5 text-xs text-emerald-400 outline-none focus:border-emerald-600"
          />
        </label>
        <label className="flex-1 min-w-[160px]">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-400">
            Company (optional)
          </span>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Patriot Freight"
            className="w-full border border-neutral-700 bg-black px-2 py-1.5 text-xs text-emerald-400 outline-none focus:border-emerald-600"
          />
        </label>
        <button
          type="submit"
          disabled={loading || (name.trim().length < 2 && company.trim().length < 2)}
          className="border border-emerald-700 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50"
        >
          {loading ? "SEARCHING…" : "SEARCH"}
        </button>
      </form>

      {error && <p className="mt-2 text-[11px] text-amber-400">⚠ {error}</p>}

      {results && (
        <ul className="mt-3 divide-y divide-neutral-800 border border-neutral-800">
          {results.length === 0 && (
            <li className="p-3 text-xs text-neutral-500">No people matched.</li>
          )}
          {results.map((p) => (
            <li key={p.apollo_person_id} className="flex items-center gap-3 p-3 text-xs">
              <div className="flex-1">
                <div className="font-medium text-neutral-100">{p.name}</div>
                <div className="text-neutral-500">
                  {p.title ?? "—"}
                  {p.organization_name ? ` · ${p.organization_name}` : ""}
                  {p.city || p.state
                    ? ` · ${[p.city, p.state].filter(Boolean).join(", ")}`
                    : ""}
                </div>
              </div>
              {p.linkedin_url && (
                <a
                  href={p.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-emerald-400 hover:text-amber-400"
                >
                  LinkedIn ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
