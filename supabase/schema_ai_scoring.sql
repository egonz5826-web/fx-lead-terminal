-- AI analyst scoring columns. Run once in the Supabase SQL editor.
-- ai_score: 0-100 FX-opportunity score from Claude Haiku.
-- ai_rationale: one-line plain-English explanation for the rep.
-- ai_scored_at: when the AI last scored this lead (null = never scored yet).

alter table leads add column if not exists ai_score integer;
alter table leads add column if not exists ai_rationale text;
alter table leads add column if not exists ai_scored_at timestamptz;
