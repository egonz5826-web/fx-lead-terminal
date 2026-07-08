import "server-only";
import { getSupabaseServerClient } from "./supabase";
import { DEFAULT_WEIGHTS } from "./scoring";
import type { Contact, Lead, ScoringWeights } from "./types";
import type { EnrichedContact, OrganizationSearchResult } from "./apollo";
import { enrichOrganization } from "./apollo";
import { normalizeDomain } from "./matching";

// Pass an owner to restrict to that rep's leads; omit for the full board (admin).
export async function getLeads(owner?: string): Promise<Lead[]> {
  const supabase = getSupabaseServerClient();
  let query = supabase.from("leads").select("*").order("company_name", { ascending: true });
  if (owner) query = query.eq("owner", owner);
  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

// Ownership guard for mutating routes: true if the user may modify this lead.
export async function userOwnsLead(leadId: string, owner: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("leads")
    .select("owner")
    .eq("id", leadId)
    .maybeSingle();
  return data?.owner === owner;
}

export interface DiscoveryContext {
  corridor: string;
  currencyExposure: string;
  owner: string;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

// Volume: log scale on annual revenue when Apollo has it ($1M→42, $10M→59,
// $100M→76, $1B→93), falling back to headcount as a rough proxy.
function volumeScore(
  annualRevenue: number | null,
  employees: number | null
): number {
  if (annualRevenue && annualRevenue > 0) {
    return clamp(25 + 17 * Math.log10(annualRevenue / 100_000), 20, 98);
  }
  if (employees && employees > 0) {
    return clamp(25 + 17 * Math.log10(employees * 250_000 / 100_000), 20, 98);
  }
  return 40;
}

// Growth: centered at 45 for flat headcount; +10% YoY→63, +20%→80, shrinking→<45.
function growthScore(growth12mo: number | null): number {
  if (growth12mo === null) return 50;
  return clamp(45 + growth12mo * 175, 15, 95);
}

// Corridor: how much FX opportunity the lead's currency pair carries for an
// FX payments/hedging pitch — peso volatility makes USD/MXN the sweet spot.
const CORRIDOR_SCORES: Record<string, number> = {
  "USD/MXN": 75,
  "USD/CNY": 65,
  "USD/JPY": 60,
  "EUR/USD": 60,
  "GBP/USD": 60,
  "USD/CAD": 55,
};

function corridorScore(currencyExposure: string): number {
  return CORRIDOR_SCORES[currencyExposure.trim().toUpperCase()] ?? 60;
}

export interface CreateLeadsResult {
  added: number;
  skippedDuplicates: number;
}

export async function createLeadsFromDiscovery(
  companies: OrganizationSearchResult[],
  context: DiscoveryContext
): Promise<CreateLeadsResult> {
  if (companies.length === 0) return { added: 0, skippedDuplicates: 0 };

  const supabase = getSupabaseServerClient();

  const { data: existingLeads } = await supabase.from("leads").select("website");
  const existingDomains = new Set(
    (existingLeads ?? [])
      .map((l) => normalizeDomain(l.website))
      .filter((d): d is string => Boolean(d))
  );
  const excludedDomains = await getExcludedDomains();

  const seen = new Set<string>();
  const deduped = companies.filter((c) => {
    const domain = normalizeDomain(c.website);
    if (!domain) return true;
    if (existingDomains.has(domain) || excludedDomains.has(domain) || seen.has(domain)) {
      return false;
    }
    seen.add(domain);
    return true;
  });
  const skippedDuplicates = companies.length - deduped.length;

  let enrichmentCallsMade = 0;

  const rows = await Promise.all(
    deduped.map(async (c) => {
      let details: Awaited<ReturnType<typeof enrichOrganization>> = null;
      if (c.website) {
        try {
          details = await enrichOrganization(c.website);
          enrichmentCallsMade += 1;
        } catch {
          details = null;
        }
      }

      const employees = details?.estimated_employees ?? null;
      const revenue = details?.annual_revenue ?? null;
      const growth = details?.growth_12mo ?? c.growth_12mo ?? null;

      const signalParts: string[] = [];
      if (details?.industry) signalParts.push(details.industry);
      if (revenue) signalParts.push(`~$${(revenue / 1_000_000).toFixed(1)}M rev`);
      if (growth !== null)
        signalParts.push(`${growth >= 0 ? "+" : ""}${(growth * 100).toFixed(0)}% HC growth`);

      return {
        company_name: c.name,
        website: c.website,
        phone: details?.phone ?? c.phone ?? null,
        city: details?.city ?? "Unknown",
        state: details?.state ?? "Unknown",
        import_corridors: context.corridor,
        currency_exposure: context.currencyExposure,
        est_annual_teu: employees ? employees * 80 : 5000,
        volume_score: volumeScore(revenue, employees),
        corridor_score: corridorScore(context.currencyExposure),
        growth_score: growthScore(growth),
        latest_signal: signalParts.length
          ? `Apollo: ${signalParts.join(" · ")}`
          : "Discovered via Apollo prospecting — scores are starting estimates",
        status: "New",
        owner: context.owner || "Unassigned",
      };
    })
  );

  if (rows.length === 0) return { added: 0, skippedDuplicates };

  const { error, count } = await supabase.from("leads").insert(rows, { count: "exact" });
  if (error) throw error;

  if (enrichmentCallsMade > 0) {
    await incrementApolloCreditsUsedBy(enrichmentCallsMade);
  }

  return { added: count ?? rows.length, skippedDuplicates };
}

export interface RescoreResult {
  processed: number;
  updated: number;
  enrichFailed: number;
  remaining: number;
}

// Re-scores a batch of leads with live Apollo firmographics (revenue,
// headcount growth) and corridor-by-currency. Batched so callers can walk
// the whole board without a single giant request.
export async function rescoreLeads(limit = 25, offset = 0): Promise<RescoreResult> {
  const supabase = getSupabaseServerClient();

  const { data: leads, error, count } = await supabase
    .from("leads")
    .select("id, website, currency_exposure, volume_score, growth_score, phone, city, state", {
      count: "exact",
    })
    .order("company_name", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw error;

  let updated = 0;
  let enrichFailed = 0;
  let enrichmentCallsMade = 0;

  for (const lead of leads ?? []) {
    let details: Awaited<ReturnType<typeof enrichOrganization>> = null;
    if (lead.website) {
      try {
        details = await enrichOrganization(lead.website);
        enrichmentCallsMade += 1;
      } catch {
        enrichFailed += 1;
      }
    }

    const fields: Record<string, unknown> = {
      corridor_score: corridorScore(lead.currency_exposure ?? ""),
    };
    if (details) {
      fields.volume_score = volumeScore(
        details.annual_revenue,
        details.estimated_employees
      );
      fields.growth_score = growthScore(details.growth_12mo);
      if (details.estimated_employees) {
        fields.est_annual_teu = details.estimated_employees * 80;
      }
      if (!lead.phone && details.phone) fields.phone = details.phone;
      if ((!lead.city || lead.city === "Unknown") && details.city) fields.city = details.city;
      if ((!lead.state || lead.state === "Unknown") && details.state) fields.state = details.state;
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update(fields)
      .eq("id", lead.id);
    if (!updateError) updated += 1;
  }

  if (enrichmentCallsMade > 0) {
    await incrementApolloCreditsUsedBy(enrichmentCallsMade);
  }

  const total = count ?? 0;
  return {
    processed: leads?.length ?? 0,
    updated,
    enrichFailed,
    remaining: Math.max(0, total - (offset + (leads?.length ?? 0))),
  };
}

export async function updateLeadStatus(leadId: string, status: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
  if (error) throw error;

  // Feed the signals panel with real team activity. Non-fatal on failure.
  try {
    const { data: lead } = await supabase
      .from("leads")
      .select("company_name")
      .eq("id", leadId)
      .maybeSingle();
    if (lead) {
      await supabase.from("lead_events").insert({
        lead_id: leadId,
        event_text: `${lead.company_name} → ${status}`,
        event_type: "status_change",
      });
    }
  } catch {
    // ignore — the status update itself already succeeded
  }
}

export async function updateLeadNotes(
  leadId: string,
  fields: { notes?: string; follow_up_date?: string | null }
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("leads").update(fields).eq("id", leadId);
  if (error) throw error;
}

export async function updateLeadOwner(leadId: string, owner: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("leads").update({ owner }).eq("id", leadId);
  if (error) throw error;
}

export async function bulkUpdateLeadOwner(
  leadIds: string[],
  owner: string
): Promise<void> {
  if (leadIds.length === 0) return;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("leads").update({ owner }).in("id", leadIds);
  if (error) throw error;
}

export async function deleteLead(leadId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("company_name, website")
    .eq("id", leadId)
    .maybeSingle();

  const domain = normalizeDomain(lead?.website);
  if (domain) {
    try {
      await supabase
        .from("excluded_companies")
        .upsert({ domain, company_name: lead?.company_name ?? null }, { onConflict: "domain" });
    } catch {
      // Non-fatal: still proceed with deleting the lead even if exclusion tracking fails.
    }
  }

  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) throw error;
}

export async function getExcludedDomains(): Promise<Set<string>> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("excluded_companies").select("domain");
  if (error) return new Set();
  return new Set((data ?? []).map((r) => r.domain));
}

export async function getKnownDomains(): Promise<Set<string>> {
  const supabase = getSupabaseServerClient();
  const [{ data: leads }, excluded] = await Promise.all([
    supabase.from("leads").select("website"),
    getExcludedDomains(),
  ]);

  const known = new Set(excluded);
  for (const l of leads ?? []) {
    const domain = normalizeDomain(l.website);
    if (domain) known.add(domain);
  }
  return known;
}

export async function getLeadById(leadId: string): Promise<Lead | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateContactPhoneByApolloId(
  apolloPersonId: string,
  phone: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("contacts")
    .update({ phone, updated_at: new Date().toISOString() })
    .eq("apollo_person_id", apolloPersonId);
  if (error) throw error;
}

export async function getContactsByLeadIds(
  leadIds: string[]
): Promise<Record<string, Contact[]>> {
  if (leadIds.length === 0) return {};

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .in("lead_id", leadIds)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const grouped: Record<string, Contact[]> = {};
  for (const contact of data ?? []) {
    if (!grouped[contact.lead_id]) grouped[contact.lead_id] = [];
    grouped[contact.lead_id].push(contact);
  }
  return grouped;
}

export async function saveEnrichedContact(
  leadId: string,
  enriched: EnrichedContact
): Promise<Contact> {
  const supabase = getSupabaseServerClient();

  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("lead_id", leadId)
    .eq("apollo_person_id", enriched.apollo_person_id)
    .maybeSingle();

  const payload = {
    lead_id: leadId,
    apollo_person_id: enriched.apollo_person_id,
    name: enriched.name,
    title: enriched.title,
    email: enriched.email,
    phone: enriched.phone,
    email_status: enriched.email_status,
    enriched: true,
    updated_at: new Date().toISOString(),
  };

  const query = existing
    ? supabase.from("contacts").update(payload).eq("id", existing.id)
    : supabase.from("contacts").insert(payload);

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function getApolloCreditsUsed(): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("apollo_usage")
    .select("credits_used")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return 0;
  return data.credits_used;
}

export async function incrementApolloCreditsUsed(): Promise<number> {
  return incrementApolloCreditsUsedBy(1);
}

export async function incrementApolloCreditsUsedBy(amount: number): Promise<number> {
  const supabase = getSupabaseServerClient();
  const current = await getApolloCreditsUsed();
  const next = current + amount;

  const { error } = await supabase
    .from("apollo_usage")
    .update({ credits_used: next, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) throw error;
  return next;
}

export async function getWeights(): Promise<
  Pick<ScoringWeights, "weight_volume" | "weight_corridor" | "weight_growth">
> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("settings")
    .select("weight_volume, weight_corridor, weight_growth")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return DEFAULT_WEIGHTS;
  return data;
}

export interface ExistingClientRow {
  account_name: string;
  website: string | null;
}

export async function getExistingClients(): Promise<ExistingClientRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("existing_clients")
    .select("account_name, website");

  if (error) return [];
  return data ?? [];
}

export async function getExistingClientsCount(): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from("existing_clients")
    .select("*", { count: "exact", head: true });

  if (error) return 0;
  return count ?? 0;
}

export async function clearExistingClients(): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("existing_clients").delete().not("id", "is", null);
  if (error) throw error;
}

export async function appendExistingClients(
  rows: ExistingClientRow[]
): Promise<number> {
  if (rows.length === 0) return 0;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("existing_clients")
    .insert(rows.map((r) => ({ account_name: r.account_name, website: r.website })));
  if (error) throw error;

  return rows.length;
}
