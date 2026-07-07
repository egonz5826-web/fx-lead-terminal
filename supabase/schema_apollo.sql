-- FX Lead Terminal — Part 2 schema addition (Apollo contacts)
-- Run this once in the Supabase SQL Editor, in addition to schema.sql.

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  apollo_person_id text,
  name text not null,
  title text,
  email text,
  phone text,
  email_status text,
  enriched boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_lead_id_idx on contacts(lead_id);

create unique index if not exists contacts_lead_apollo_person_idx
  on contacts(lead_id, apollo_person_id);

create table if not exists apollo_usage (
  id integer primary key default 1,
  credits_used integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into apollo_usage (id, credits_used)
values (1, 0)
on conflict (id) do nothing;
