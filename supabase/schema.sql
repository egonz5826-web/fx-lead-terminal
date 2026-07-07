-- FX Lead Terminal — schema
-- Run this once in the Supabase SQL Editor (Part 1 setup).

create extension if not exists "pgcrypto";

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  website text,
  city text not null,
  state text not null,
  import_corridors text not null,
  currency_exposure text not null,
  est_annual_teu integer not null,
  volume_score numeric not null check (volume_score between 0 and 100),
  corridor_score numeric not null check (corridor_score between 0 and 100),
  growth_score numeric not null check (growth_score between 0 and 100),
  latest_signal text not null,
  status text not null default 'New',
  owner text not null,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id integer primary key default 1,
  weight_volume numeric not null default 0.4,
  weight_corridor numeric not null default 0.35,
  weight_growth numeric not null default 0.25,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into settings (id, weight_volume, weight_corridor, weight_growth)
values (1, 0.4, 0.35, 0.25)
on conflict (id) do nothing;

create table if not exists lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  event_text text not null,
  event_type text not null,
  created_at timestamptz not null default now()
);

-- This app talks to Supabase only from the server using the service role
-- key, so Row Level Security stays disabled and there is nothing to expose
-- to the browser.
