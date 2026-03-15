export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type SplitType = "full_body" | "upper_lower" | "push_pull_legs";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type DayTrainingState = "gym" | "rest" | "recovery";

export interface WorkoutGenerationOptions {
    forceRegenerate?: boolean;
    preferredSplit?: SplitType | null;
    dayStates?: Record<number, DayTrainingState> | null;
}

export interface WorkoutPlanRecommendation {
    splitType: SplitType;
    label: string;
    rationale: string;
}

export interface WeeklyTrainingSchedule {
    user_id: string;
    day_states: Record<number, DayTrainingState>;
    gym_days: number[];
    rest_days: number[];
    recovery_days: number[];
    source: "preset" | "manual";
    preset_id?: "balanced" | "push_pull_legs" | "recovery_first" | null;
    updated_at: string;
}

export interface WorkoutProfile {
    experience_level?: ExperienceLevel | null;
    available_days_per_week?: number | null;
    goal?: "lose weight" | "maintain" | "build muscle" | "improve endurance" | null;
}

export interface Exercise {
    id: string;
    name: string;
    muscle_group: string;
    image?: string | null;
    demonstration_url: string | null;
    execution_steps: string[];
    sets: number;
    reps: number;
    rest_seconds: number;
    difficulty: Difficulty;
    equipment: string[];
    created_at?: string;
    updated_at?: string;
}

export interface DailyWorkout {
    day_of_week: number;
    muscle_group: string | null;
    is_rest_day: boolean;
    exercises: Exercise[];
}

export interface WeeklyWorkoutPlan {
    id: string;
    user_id: string;
    week_start_date: string;
    split_type: SplitType;
    daily_workouts: DailyWorkout[];
    created_at: string;
    updated_at: string;
}

export interface WorkoutCompletion {
    id: string;
    user_id: string;
    workout_plan_id: string;
    date: string;
    day_of_week: number;
    exercise_id?: string | null;
    completed_at: string;
}
