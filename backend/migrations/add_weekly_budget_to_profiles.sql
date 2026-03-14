-- Add weekly_budget column to profiles table
alter table public.profiles
    add column if not exists weekly_budget double precision;
