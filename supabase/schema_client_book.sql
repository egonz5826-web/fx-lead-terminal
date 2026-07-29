-- Jesus's client book (his color-coded Excel, digitized). Run once in Supabase.
-- status mirrors his legend colors; owner defaults to jesus.

create table if not exists client_book (
  id uuid primary key default gen_random_uuid(),
  number int,
  name text not null,
  status text not null default 'Uncategorized',
  on_sf boolean default false,
  consultant text,
  website text,
  referenciador text,
  communication text,
  dealer text,
  traded text,
  last_follow_up text,
  follow_up text,
  comments text,
  contact_rr text,
  owner text not null default 'jesus',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_book_owner_idx on client_book (owner);
create index if not exists client_book_status_idx on client_book (status);
