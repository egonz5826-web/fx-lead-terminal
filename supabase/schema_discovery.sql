-- Discovery tagging so reps can slice the public pool. Run once in Supabase.
-- industry: company's Apollo industry, promoted to its own column so it's
--   filterable (previously only in the latest_signal text).
-- discovered_by: the rep who ran the Discover search that added this lead
--   (does NOT claim it — it stays public; this is just a "my haul" filter).
-- search_keywords: the keywords that search used.

alter table leads add column if not exists industry text;
alter table leads add column if not exists discovered_by text;
alter table leads add column if not exists search_keywords text;
