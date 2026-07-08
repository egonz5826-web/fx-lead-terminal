import "server-only";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "./supabase";
import { verifySession } from "./session";

export interface AppUser {
  username: string;
  display_name: string;
  role: "admin" | "rep";
}

export async function getUserByUsername(username: string): Promise<
  (AppUser & { password_hash: string }) | null
> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("username, display_name, role, password_hash")
    .eq("username", username)
    .maybeSingle();
  if (error || !data) return null;
  return data as AppUser & { password_hash: string };
}

// Reads and verifies the session cookie, returns the logged-in user or null.
export async function getSessionUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("fx_session")?.value;
  const username = verifySession(raw);
  if (!username) return null;

  const user = await getUserByUsername(username);
  if (!user) return null;
  return { username: user.username, display_name: user.display_name, role: user.role };
}

export async function listUsers(): Promise<AppUser[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("username, display_name, role")
    .order("role", { ascending: true })
    .order("display_name", { ascending: true });
  if (error || !data) return [];
  return data as AppUser[];
}

export async function updateUserPassword(
  username: string,
  passwordHash: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("users")
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq("username", username);
  if (error) throw error;
}
