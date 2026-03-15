import api from "./api";
import type { DayTrainingState, Exercise, WeeklyWorkoutPlan, WorkoutCompletion } from "@/types/workout";

export interface GenerateWorkoutRequest {
    force_regenerate?: boolean;
    preferred_split?: "full_body" | "upper_lower" | "push_pull_legs";
    day_states?: Record<number, DayTrainingState>;
}

export async function generateWorkoutPlan(
    userId: string,
    options?: {
        forceRegenerate?: boolean;
        preferredSplit?: "full_body" | "upper_lower" | "push_pull_legs" | null;
        dayStates?: Record<number, DayTrainingState> | null;
    }
): Promise<WeeklyWorkoutPlan> {
    void userId;
    const payload: GenerateWorkoutRequest = {
        force_regenerate: options?.forceRegenerate ?? false,
    };

    if (options?.preferredSplit) {
        payload.preferred_split = options.preferredSplit;
    }

    if (options?.dayStates) {
        payload.day_states = options.dayStates;
    }

    const { data } = await api.post<WeeklyWorkoutPlan>("/workout/generate", {
        ...payload,
    } satisfies GenerateWorkoutRequest);
    return data;
}

export async function fetchWorkoutPlan(userId: string): Promise<WeeklyWorkoutPlan | null> {
    try {
        const { data } = await api.get<WeeklyWorkoutPlan>(`/workout/plan/${userId}`);
        return data;
    } catch (error: any) {
        if (error?.response?.status === 404) {
            return null;
        }
        throw error;
    }
}

export async function markWorkoutComplete(
    userId: string,
    planId: string,
    date: string,
    dayOfWeek: number,
    exerciseId?: string
): Promise<WorkoutCompletion> {
    void userId;
    const { data } = await api.post<WorkoutCompletion>("/workout/complete", {
        workout_plan_id: planId,
        date,
        day_of_week: dayOfWeek,
        exercise_id: exerciseId ?? null,
    });
    return data;
}

export async function undoWorkoutComplete(
    planId: string,
    date: string,
    dayOfWeek: number,
    exerciseId?: string
): Promise<void> {
    await api.delete("/workout/complete", {
        params: {
            workout_plan_id: planId,
            date,
            day_of_week: dayOfWeek,
            exercise_id: exerciseId ?? undefined,
        },
    });
}

export async function fetchExerciseDetails(exerciseId: string): Promise<Exercise> {
    const { data } = await api.get<Exercise>(`/workout/exercises/${exerciseId}`);
    return data;
}

export async function fetchWorkoutCompletions(planId: string): Promise<WorkoutCompletion[]> {
    const { data } = await api.get<WorkoutCompletion[]>(`/workout/completions/${planId}`);
    return data;
}
