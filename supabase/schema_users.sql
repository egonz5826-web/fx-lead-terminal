-- FX Lead Terminal — multi-user accounts
-- Run once in the Supabase SQL Editor. Accounts are seeded by a script
-- (scripts/seed-users.mjs), not created from the UI, so access stays locked
-- to the seeded team.

create table if not exists users (
  username text primary key,
  display_name text not null,
  password_hash text not null,
  role text not null default 'rep' check (role in ('admin', 'rep')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
