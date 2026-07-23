"use client";

import { useState } from "react";
import type { ApolloSearchMatch, Contact } from "@/lib/types";
import { useApolloUsage } from "./ApolloUsageContext";

export default function LeadContactsCell({
  leadId,
  companyName,
  hasWebsite,
  initialContacts,
  onContactsChange,
}: {
  leadId: string;
  companyName: string;
  hasWebsite: boolean;
  initialContacts: Contact[];
  // Keep the parent lead board in sync. Without this, a contact enriched in
  // Public Pool only lives in this cell's temporary state and disappears when
  // the lead immediately moves into My Leads.
  onContactsChange?: (leadId: string, contacts: Contact[]) => void;
}) {
  const { setCreditsUsed } = useApolloUsage();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<ApolloSearchMatch[] | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [pendingPhoneIds, setPendingPhoneIds] = useState<Set<string>>(new Set());

  const enrichedIds = new Set(contacts.map((c) => c.apollo_person_id));

  async function handleFindContacts() {
    setOpen(true);
    setError(null);
    setMatches(null);

    if (!hasWebsite) {
      setError("This lead has no website on file, so Apollo can't match a company.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/apollo/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong searching Apollo.");
        return;
      }
      setMatches(data.matches ?? []);
      if ((data.matches ?? []).length === 0) {
        setError(data.message ?? "No matches found for this company.");
      }
    } catch {
      setError("Couldn't reach Apollo. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Apollo reveals phone numbers asynchronously (via webhook). Poll for it so
  // it appears on its own — no manual page refresh. Gives up after ~3 minutes.
  async function pollForPhone(apolloPersonId: string) {
    for (let i = 0; i < 36; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const res = await fetch(
          `/api/apollo/contact-phone?apolloPersonId=${encodeURIComponent(apolloPersonId)}`
        );
        if (!res.ok) continue;
        const data = await res.json();
        if (data.phone) {
          setContacts((prev) => {
            const next = prev.map((c) =>
              c.apollo_person_id === apolloPersonId ? { ...c, phone: data.phone } : c
            );
            onContactsChange?.(leadId, next);
            return next;
          });
          setPendingPhoneIds((prev) => {
            const next = new Set(prev);
            next.delete(apolloPersonId);
            return next;
          });
          return;
        }
      } catch {
        // keep polling
      }
    }
  }

  async function handleEnrich(match: ApolloSearchMatch) {
    const confirmed = window.confirm(
      `Enriching ${match.name} will use 1 Apollo credit to reveal a verified email and phone number. Continue?`
    );
    if (!confirmed) return;

    setEnrichingId(match.apollo_person_id);
    setError(null);
    try {
      const res = await fetch("/api/apollo/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, apolloPersonId: match.apollo_person_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong enriching this contact.");
        return;
      }
      setContacts((prev) => {
        const next = prev.some((contact) => contact.id === data.contact.id)
          ? prev.map((contact) => (contact.id === data.contact.id ? data.contact : contact))
          : [...prev, data.contact];
        onContactsChange?.(leadId, next);
        return next;
      });
      setCreditsUsed(data.creditsUsed);
      if (data.phonePending && data.contact.apollo_person_id) {
        setPendingPhoneIds((prev) => new Set(prev).add(data.contact.apollo_person_id));
        pollForPhone(data.contact.apollo_person_id);
      }
    } catch {
      setError("Couldn't reach Apollo. Check your connection and try again.");
    } finally {
      setEnrichingId(null);
    }
  }

  return (
    <div>
      {contacts.length > 0 && (
        <ul className="mb-1 space-y-1">
          {contacts.map((c) => (
            <li key={c.id} className="text-[11px] text-neutral-300">
              <div className="font-medium text-neutral-100">
                {c.name}
                {c.title ? ` — ${c.title}` : ""}
              </div>
              {c.email && <div className="text-emerald-400">{c.email}</div>}
              {c.phone ? (
                <div className="text-neutral-400">{c.phone}</div>
              ) : c.apollo_person_id && pendingPhoneIds.has(c.apollo_person_id) ? (
                <div className="text-amber-500">phone pending (~few min)</div>
              ) : null}
              <a
                href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
                  `${c.name} ${companyName}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-neutral-500 hover:text-emerald-400 hover:underline"
              >
                search on LinkedIn →
              </a>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={handleFindContacts}
        className="whitespace-nowrap border border-neutral-700 px-2 py-1 text-[10px] text-neutral-300 hover:border-emerald-700 hover:text-emerald-400"
      >
        FIND CONTACTS
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md border border-emerald-900 bg-neutral-950 p-4 font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-widest text-emerald-500">
                CONTACTS — {companyName.toUpperCase()}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-neutral-500 hover:text-neutral-300"
              >
                ✕
              </button>
            </div>

            {loading && (
              <div className="text-xs text-neutral-400">Searching Apollo…</div>
            )}

            {error && (
              <div className="mb-3 border border-amber-900 bg-amber-950/20 p-2 text-xs text-amber-400">
                ⚠ {error}
              </div>
            )}

            {matches && matches.length > 0 && (
              <ul className="space-y-2">
                {matches.map((m) => {
                  const isEnriched = enrichedIds.has(m.apollo_person_id);
                  return (
                    <li
                      key={m.apollo_person_id}
                      className="flex items-center justify-between border border-neutral-800 p-2"
                    >
                      <div className="text-xs">
                        <div className="font-medium text-neutral-100">{m.name}</div>
                        <div className="text-neutral-400">{m.title ?? "—"}</div>
                      </div>
                      {isEnriched ? (
                        <span className="text-[10px] text-emerald-500">ENRICHED</span>
                      ) : (
                        <button
                          onClick={() => handleEnrich(m)}
                          disabled={enrichingId === m.apollo_person_id}
                          className="border border-emerald-700 bg-emerald-950/40 px-2 py-1 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-900/40 disabled:opacity-50"
                        >
                          {enrichingId === m.apollo_person_id ? "ENRICHING…" : "ENRICH"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
