import "server-only";
import { getSupabaseServerClient } from "./supabase";
import { DEFAULT_WEIGHTS } from "./scoring";
import type { Contact, Lead, ScoringWeights } from "./types";
import type { EnrichedContact } from "./apollo";

export async function getLeads(): Promise<Lead[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("company_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
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
  const { data, error } = await supabase
    .from("contacts")
    .upsert(
      {
        lead_id: leadId,
        apollo_person_id: enriched.apollo_person_id,
        name: enriched.name,
        title: enriched.title,
        email: enriched.email,
        phone: enriched.phone,
        email_status: enriched.email_status,
        enriched: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_id,apollo_person_id" }
    )
    .select()
    .single();

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
  const supabase = getSupabaseServerClient();
  const current = await getApolloCreditsUsed();
  const next = current + 1;

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
