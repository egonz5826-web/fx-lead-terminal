-- FX Lead Terminal — permanent exclusion list
-- Prevents discarded/deleted companies from ever being re-suggested by Discover.
-- Run this once in the Supabase SQL Editor.

create table if not exists excluded_companies (
  domain text primary key,
  company_name text,
  excluded_at timestamptz not null default now()
);
