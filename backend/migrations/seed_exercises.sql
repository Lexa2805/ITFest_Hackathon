-- ---------------------------------------------------------------------------
-- Seed Exercises Table
-- ---------------------------------------------------------------------------
-- This script populates the exercises table with 30 exercises covering all
-- major muscle groups across beginner, intermediate, and advanced difficulty levels.
-- Each exercise includes demonstration URLs, execution steps, and equipment requirements.

create extension if not exists pgcrypto;

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

-- Clear existing exercises (optional - remove if you want to preserve existing data)
-- truncate table public.exercises cascade;

-- CHEST EXERCISES
insert into public.exercises (name, demonstration_url, execution_steps, muscle_group, equipment, sets, reps, rest_seconds, difficulty) values
('Push-ups', 'https://example.com/demos/pushups.gif', 
 '["Start in a plank position with hands shoulder-width apart", "Lower your body until chest nearly touches the floor", "Keep your core tight and back straight", "Push back up to starting position"]'::jsonb,
 'chest', '[]'::jsonb, 3, 12, 60, 'beginner'),

('Dumbbell Bench Press', 'https://example.com/demos/db-bench-press.gif',
 '["Lie on a flat bench with dumbbells at chest level", "Press dumbbells up until arms are fully extended", "Lower dumbbells slowly back to chest level", "Keep shoulder blades retracted throughout"]'::jsonb,
 'chest', '["dumbbells", "bench"]'::jsonb, 4, 10, 90, 'intermediate'),

('Barbell Bench Press', 'https://example.com/demos/barbell-bench.gif',
 '["Lie on bench with feet flat on floor", "Grip barbell slightly wider than shoulder-width", "Lower bar to mid-chest with control", "Press bar up explosively until arms are extended", "Keep elbows at 45-degree angle"]'::jsonb,
 'chest', '["barbell", "bench"]'::jsonb, 4, 8, 120, 'advanced');

-- BACK EXERCISES

insert into public.exercises (name, demonstration_url, execution_steps, muscle_group, equipment, sets, reps, rest_seconds, difficulty) values
('Bent Over Rows', 'https://example.com/demos/bent-over-rows.gif',
 '["Stand with feet hip-width apart holding dumbbells", "Hinge at hips with slight knee bend", "Pull dumbbells to ribcage, squeezing shoulder blades", "Lower with control and repeat"]'::jsonb,
 'back', '["dumbbells"]'::jsonb, 3, 12, 60, 'beginner'),

('Pull-ups', 'https://example.com/demos/pullups.gif',
 '["Hang from bar with overhand grip, hands shoulder-width apart", "Pull yourself up until chin clears the bar", "Lower yourself with control to full extension", "Avoid swinging or using momentum"]'::jsonb,
 'back', '["pull-up bar"]'::jsonb, 3, 8, 90, 'intermediate'),

('Deadlifts', 'https://example.com/demos/deadlifts.gif',
 '["Stand with feet hip-width apart, barbell over mid-foot", "Grip bar just outside legs, chest up, back straight", "Drive through heels to lift bar, keeping it close to body", "Stand fully upright, then lower bar with control", "Maintain neutral spine throughout movement"]'::jsonb,
 'back', '["barbell"]'::jsonb, 4, 6, 180, 'advanced');

-- LEGS EXERCISES
insert into public.exercises (name, demonstration_url, execution_steps, muscle_group, equipment, sets, reps, rest_seconds, difficulty) values
('Bodyweight Squats', 'https://example.com/demos/bodyweight-squats.gif',
 '["Stand with feet shoulder-width apart", "Lower hips back and down as if sitting in a chair", "Keep chest up and knees tracking over toes", "Descend until thighs are parallel to ground", "Push through heels to return to standing"]'::jsonb,
 'legs', '[]'::jsonb, 3, 15, 60, 'beginner'),

('Goblet Squats', 'https://example.com/demos/goblet-squats.gif',
 '["Hold dumbbell vertically at chest level", "Stand with feet slightly wider than shoulder-width", "Squat down keeping chest up and elbows inside knees", "Drive through heels to stand back up"]'::jsonb,
 'legs', '["dumbbell"]'::jsonb, 4, 12, 90, 'intermediate'),

('Barbell Back Squats', 'https://example.com/demos/barbell-squats.gif',
 '["Position barbell on upper back, feet shoulder-width apart", "Brace core and descend by breaking at hips and knees", "Keep chest up and knees out", "Squat to parallel or below", "Drive through heels to return to standing"]'::jsonb,
 'legs', '["barbell", "squat rack"]'::jsonb, 4, 8, 150, 'advanced'),

('Lunges', 'https://example.com/demos/lunges.gif',
 '["Stand tall with feet hip-width apart", "Step forward with one leg and lower hips", "Lower until both knees are at 90 degrees", "Push through front heel to return to start", "Alternate legs"]'::jsonb,
 'legs', '[]'::jsonb, 3, 12, 60, 'beginner'),

('Romanian Deadlifts', 'https://example.com/demos/rdl.gif',
 '["Hold barbell at hip level with overhand grip", "Hinge at hips, pushing them back while keeping legs mostly straight", "Lower bar along thighs until you feel hamstring stretch", "Drive hips forward to return to standing"]'::jsonb,
 'legs', '["barbell"]'::jsonb, 4, 10, 90, 'intermediate');

-- SHOULDERS EXERCISES
insert into public.exercises (name, demonstration_url, execution_steps, muscle_group, equipment, sets, reps, rest_seconds, difficulty) values
('Dumbbell Shoulder Press', 'https://example.com/demos/db-shoulder-press.gif',
 '["Sit or stand with dumbbells at shoulder height", "Press dumbbells overhead until arms are fully extended", "Lower dumbbells back to shoulder level with control", "Keep core engaged throughout"]'::jsonb,
 'shoulders', '["dumbbells"]'::jsonb, 3, 12, 60, 'beginner'),

('Lateral Raises', 'https://example.com/demos/lateral-raises.gif',
 '["Stand with dumbbells at sides, slight bend in elbows", "Raise arms out to sides until parallel with floor", "Lead with elbows, not hands", "Lower with control and repeat"]'::jsonb,
 'shoulders', '["dumbbells"]'::jsonb, 3, 15, 60, 'intermediate'),

('Overhead Press', 'https://example.com/demos/overhead-press.gif',
 '["Stand with barbell at shoulder level, hands just outside shoulders", "Brace core and press bar overhead", "Lock out arms at top, bar over mid-foot", "Lower bar to shoulders with control", "Avoid leaning back excessively"]'::jsonb,
 'shoulders', '["barbell"]'::jsonb, 4, 8, 120, 'advanced');

-- ARMS EXERCISES
insert into public.exercises (name, demonstration_url, execution_steps, muscle_group, equipment, sets, reps, rest_seconds, difficulty) values
('Bicep Curls', 'https://example.com/demos/bicep-curls.gif',
 '["Stand with dumbbells at sides, palms facing forward", "Curl weights up toward shoulders", "Keep elbows stationary at sides", "Lower with control to starting position"]'::jsonb,
 'arms', '["dumbbells"]'::jsonb, 3, 12, 60, 'beginner'),

('Tricep Dips', 'https://example.com/demos/tricep-dips.gif',
 '["Position hands on bench or parallel bars", "Lower body by bending elbows to 90 degrees", "Keep elbows close to body", "Push back up to starting position"]'::jsonb,
 'arms', '["bench or dip bars"]'::jsonb, 3, 10, 60, 'intermediate'),

('Close-Grip Bench Press', 'https://example.com/demos/close-grip-bench.gif',
 '["Lie on bench with hands shoulder-width apart on barbell", "Lower bar to lower chest keeping elbows tucked", "Press bar back up explosively", "Focus on tricep engagement"]'::jsonb,
 'arms', '["barbell", "bench"]'::jsonb, 4, 10, 90, 'advanced'),

('Hammer Curls', 'https://example.com/demos/hammer-curls.gif',
 '["Stand with dumbbells at sides, palms facing each other", "Curl weights up keeping palms neutral", "Squeeze at top of movement", "Lower with control"]'::jsonb,
 'arms', '["dumbbells"]'::jsonb, 3, 12, 60, 'intermediate');

-- CORE EXERCISES
insert into public.exercises (name, demonstration_url, execution_steps, muscle_group, equipment, sets, reps, rest_seconds, difficulty) values
('Plank', 'https://example.com/demos/plank.gif',
 '["Start in forearm plank position", "Keep body in straight line from head to heels", "Engage core and glutes", "Hold position for prescribed time", "Breathe steadily throughout"]'::jsonb,
 'core', '[]'::jsonb, 3, 30, 60, 'beginner'),

('Russian Twists', 'https://example.com/demos/russian-twists.gif',
 '["Sit on floor with knees bent, feet elevated", "Lean back slightly, keeping back straight", "Rotate torso side to side", "Touch floor on each side", "Keep core engaged throughout"]'::jsonb,
 'core', '[]'::jsonb, 3, 20, 60, 'intermediate'),

('Hanging Leg Raises', 'https://example.com/demos/hanging-leg-raises.gif',
 '["Hang from pull-up bar with overhand grip", "Keep legs straight and raise them to 90 degrees", "Control the descent back to starting position", "Avoid swinging or using momentum", "Focus on lower ab contraction"]'::jsonb,
 'core', '["pull-up bar"]'::jsonb, 3, 12, 90, 'advanced'),

('Dead Bug', 'https://example.com/demos/dead-bug.gif',
 '["Lie on back with arms extended toward ceiling", "Lift legs with knees at 90 degrees", "Lower opposite arm and leg simultaneously", "Return to start and alternate sides", "Keep lower back pressed to floor"]'::jsonb,
 'core', '[]'::jsonb, 3, 12, 60, 'beginner');

-- FULL BODY / COMPOUND EXERCISES
insert into public.exercises (name, demonstration_url, execution_steps, muscle_group, equipment, sets, reps, rest_seconds, difficulty) values
('Burpees', 'https://example.com/demos/burpees.gif',
 '["Start standing, then drop into squat position", "Place hands on floor and jump feet back to plank", "Perform a push-up", "Jump feet back to squat position", "Explosively jump up with arms overhead"]'::jsonb,
 'full_body', '[]'::jsonb, 3, 10, 90, 'intermediate'),

('Kettlebell Swings', 'https://example.com/demos/kb-swings.gif',
 '["Stand with feet shoulder-width apart, kettlebell between legs", "Hinge at hips and swing kettlebell back between legs", "Drive hips forward explosively to swing kettlebell to chest height", "Let kettlebell swing back down and repeat", "Keep arms straight throughout movement"]'::jsonb,
 'full_body', '["kettlebell"]'::jsonb, 4, 15, 90, 'intermediate'),

('Thrusters', 'https://example.com/demos/thrusters.gif',
 '["Hold dumbbells at shoulder level", "Perform a front squat", "As you stand, press dumbbells overhead in one fluid motion", "Lower dumbbells back to shoulders", "Immediately descend into next squat"]'::jsonb,
 'full_body', '["dumbbells"]'::jsonb, 4, 10, 120, 'advanced'),

('Mountain Climbers', 'https://example.com/demos/mountain-climbers.gif',
 '["Start in high plank position", "Drive one knee toward chest", "Quickly switch legs in a running motion", "Keep hips level and core engaged", "Maintain steady breathing rhythm"]'::jsonb,
 'full_body', '[]'::jsonb, 3, 20, 60, 'beginner'),

('Box Jumps', 'https://example.com/demos/box-jumps.gif',
 '["Stand facing a sturdy box or platform", "Swing arms back and bend knees slightly", "Explosively jump onto box, landing softly", "Stand fully upright on box", "Step down carefully and repeat"]'::jsonb,
 'full_body', '["plyo box"]'::jsonb, 3, 10, 120, 'advanced'),

('Farmer Carries', 'https://example.com/demos/farmer-carries.gif',
 '["Hold heavy dumbbells or kettlebells at sides", "Stand tall with shoulders back", "Walk forward with controlled steps", "Keep core braced and avoid leaning", "Maintain grip throughout prescribed distance"]'::jsonb,
 'full_body', '["dumbbells or kettlebells"]'::jsonb, 3, 40, 90, 'intermediate');

-- Success message
select 'Successfully seeded ' || count(*) || ' exercises' as message
from public.exercises;
