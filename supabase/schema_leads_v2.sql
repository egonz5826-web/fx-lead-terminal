-- FX Lead Terminal — add phone, notes, and follow-up date to leads
-- Run this once in the Supabase SQL Editor.

alter table leads add column if not exists phone text;
alter table leads add column if not exists notes text;
alter table leads add column if not exists follow_up_date date;
