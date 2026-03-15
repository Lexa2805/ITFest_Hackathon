-- Enable per-exercise workout completion tracking while preserving whole-day completion.

alter table if exists public.workout_completions
    add column if not exists exercise_id uuid references public.exercises(id) on delete cascade;

-- Drop legacy uniqueness that prevented multiple exercise completions on same day.
do $$
begin
    if exists (
        select 1
        from pg_constraint
        where conname = 'workout_completions_user_id_workout_plan_id_date_key'
          and conrelid = 'public.workout_completions'::regclass
    ) then
        alter table public.workout_completions
            drop constraint workout_completions_user_id_workout_plan_id_date_key;
    end if;
end$$;

-- One whole-day completion record per date.
create unique index if not exists idx_workout_completions_unique_day
    on public.workout_completions(user_id, workout_plan_id, date)
    where exercise_id is null;

-- One per-exercise completion record per date.
create unique index if not exists idx_workout_completions_unique_exercise
    on public.workout_completions(user_id, workout_plan_id, date, exercise_id)
    where exercise_id is not null;

create index if not exists idx_workout_completions_exercise_id
    on public.workout_completions(exercise_id);
