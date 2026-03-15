-- ---------------------------------------------------------------------------
-- Workout Tables
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- Table 1: Exercises
-- Stores exercise library with demonstration media, execution steps, and metadata
create table if not exists public.exercises (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    demonstration_url text,
    execution_steps jsonb not null default '[]'::jsonb,
    muscle_group text not null,
    equipment jsonb not null default '[]'::jsonb,
    sets integer not null check (sets between 1 and 10),
    reps integer not null check (reps between 1 and 50),
    rest_seconds integer not null default 60 check (rest_seconds between 30 and 300),
    difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Table 2: Workout Plans
-- Stores weekly workout plans for users with daily workout assignments
create table if not exists public.workout_plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    week_start_date date not null,
    split_type text not null check (split_type in ('full_body', 'upper_lower', 'push_pull_legs')),
    daily_workouts jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Table 3: Workout Completions
-- Tracks when users complete workouts
create table if not exists public.workout_completions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
    date date not null,
    day_of_week integer not null check (day_of_week between 0 and 6),
    completed_at timestamptz not null default now(),
    unique(user_id, workout_plan_id, date)
);

-- Indexes for performance
create index if not exists idx_exercises_muscle_group
    on public.exercises(muscle_group);

create index if not exists idx_exercises_difficulty
    on public.exercises(difficulty);

create index if not exists idx_workout_plans_user_id
    on public.workout_plans(user_id);

create index if not exists idx_workout_plans_week_start_date
    on public.workout_plans(week_start_date desc);

create index if not exists idx_workout_plans_user_week
    on public.workout_plans(user_id, week_start_date desc);

create index if not exists idx_workout_completions_user_id
    on public.workout_completions(user_id);

create index if not exists idx_workout_completions_date
    on public.workout_completions(date desc);

-- Row Level Security
alter table public.exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_completions enable row level security;

-- RLS Policies for exercises (public read access)
drop policy if exists "Anyone can view exercises" on public.exercises;
create policy "Anyone can view exercises"
    on public.exercises for select
    using (true);

-- RLS Policies for workout_plans
drop policy if exists "Users can view own workout plans" on public.workout_plans;
create policy "Users can view own workout plans"
    on public.workout_plans for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own workout plans" on public.workout_plans;
create policy "Users can insert own workout plans"
    on public.workout_plans for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own workout plans" on public.workout_plans;
create policy "Users can update own workout plans"
    on public.workout_plans for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own workout plans" on public.workout_plans;
create policy "Users can delete own workout plans"
    on public.workout_plans for delete
    using (auth.uid() = user_id);

-- RLS Policies for workout_completions
drop policy if exists "Users can view own workout completions" on public.workout_completions;
create policy "Users can view own workout completions"
    on public.workout_completions for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own workout completions" on public.workout_completions;
create policy "Users can insert own workout completions"
    on public.workout_completions for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own workout completions" on public.workout_completions;
create policy "Users can update own workout completions"
    on public.workout_completions for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own workout completions" on public.workout_completions;
create policy "Users can delete own workout completions"
    on public.workout_completions for delete
    using (auth.uid() = user_id);
