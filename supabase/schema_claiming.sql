-- Public/private lead flow + multi-source phone numbers. Run once in Supabase.

-- When a rep claims a lead (Pick Lead, or a claiming status). Null = in the
-- public pool. Used for the 15-day auto-release timer.
alter table leads add column if not exists claimed_at timestamptz;

-- Every distinct phone number we have for a lead, tagged by source
-- (apollo / zoominfo / seamless). Lets reps see all numbers when sources
-- disagree.
create table if not exists lead_phones (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  phone text not null,
  source text not null,
  created_at timestamptz not null default now(),
  unique (lead_id, phone)
);

create index if not exists lead_phones_lead_id_idx on lead_phones (lead_id);
