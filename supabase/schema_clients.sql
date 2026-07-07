-- FX Lead Terminal — existing-client matching (manual Salesforce CSV import)
-- Run this once in the Supabase SQL Editor.

create table if not exists existing_clients (
  id uuid primary key default gen_random_uuid(),
  account_name text not null,
  website text,
  imported_at timestamptz not null default now()
);

create index if not exists existing_clients_account_name_idx on existing_clients(account_name);
