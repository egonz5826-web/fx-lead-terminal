import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-side only client using the service role key. Never import this
// from a Client Component — the "server-only" package throws a build
// error if that ever happens by mistake.
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
