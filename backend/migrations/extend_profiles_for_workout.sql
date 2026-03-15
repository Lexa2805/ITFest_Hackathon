-- ---------------------------------------------------------------------------
-- Extend Profiles Table for Workout Feature
-- ---------------------------------------------------------------------------

-- Add experience_level column
alter table public.profiles
    add column if not exists experience_level text
    check (experience_level in ('beginner', 'intermediate', 'advanced'));

-- Add available_days_per_week column
alter table public.profiles
    add column if not exists available_days_per_week integer
    check (available_days_per_week between 1 and 7);

-- Add comment for documentation
comment on column public.profiles.experience_level is 'User fitness experience level: beginner, intermediate, or advanced';
comment on column public.profiles.available_days_per_week is 'Number of days per week user can train (1-7)';
