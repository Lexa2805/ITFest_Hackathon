-- Add profile visibility toggle to profiles table
alter table if exists public.profiles
    add column if not exists is_profile_public boolean not null default true;
