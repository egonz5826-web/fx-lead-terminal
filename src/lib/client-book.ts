import "server-only";
import { getSupabaseServerClient } from "./supabase";
import type { ClientBook } from "./types";
import { FOLLOW_UP_STATUS } from "./types";

export async function getClientBook(owner = "jesus"): Promise<ClientBook[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("client_book")
    .select("*")
    .eq("owner", owner)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Editable fields on a client (everything but ids/owner/timestamps).
export type ClientInput = Partial<
  Pick<
    ClientBook,
    | "number"
    | "name"
    | "status"
    | "on_sf"
    | "consultant"
    | "website"
    | "referenciador"
    | "communication"
    | "dealer"
    | "traded"
    | "last_follow_up"
    | "follow_up"
    | "comments"
    | "contact_rr"
  >
>;

export async function addClient(input: ClientInput, owner = "jesus"): Promise<ClientBook> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("client_book")
    .insert({ ...input, owner })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClient(id: string, fields: ClientInput): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("client_book")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("client_book").delete().eq("id", id);
  if (error) throw error;
}

// Clients Jesus flagged for follow-up — used by the Wednesday reminder.
export async function getFollowUpClients(owner = "jesus"): Promise<ClientBook[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("client_book")
    .select("*")
    .eq("owner", owner)
    .eq("status", FOLLOW_UP_STATUS)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
