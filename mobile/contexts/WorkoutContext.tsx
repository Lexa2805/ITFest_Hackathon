import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuthStore } from "@/stores/authStore";
import {
    fetchWorkoutPlan,
    fetchWorkoutCompletions,
    generateWorkoutPlan,
    markWorkoutComplete,
    undoWorkoutComplete,
} from "@/services/workoutApi";
import type { WeeklyWorkoutPlan, WorkoutCompletion, WorkoutGenerationOptions } from "@/types/workout";

interface WorkoutContextValue {
    currentPlan: WeeklyWorkoutPlan | null;
    selectedDay: number;
    completions: WorkoutCompletion[];
    loading: boolean;
    error: string | null;
    completedDays: Record<number, boolean>;
    completedExercisesByDay: Record<number, Record<string, boolean>>;
    completedCount: number;
    loadWorkoutPlan: () => Promise<void>;
    generateNewPlan: (options?: WorkoutGenerationOptions) => Promise<void>;
    completeWorkout: (date: string, dayOfWeek: number, exerciseId?: string) => Promise<void>;
    undoWorkout: (date: string, dayOfWeek: number, exerciseId?: string) => Promise<void>;
    selectDay: (dayIndex: number) => void;
}

const WorkoutContext = createContext<WorkoutContextValue | undefined>(undefined);

function buildExerciseCompletionMap(records: WorkoutCompletion[]): Record<number, Record<string, boolean>> {
    return records.reduce<Record<number, Record<string, boolean>>>((acc, item) => {
        if (!item.exercise_id) {
            return acc;
        }

        if (!acc[item.day_of_week]) {
            acc[item.day_of_week] = {};
        }

        acc[item.day_of_week][item.exercise_id] = true;
        return acc;
    }, {});
}

function toErrorMessage(error: any, fallback: string): string {
    const detail = error?.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
        return detail;
    }
    if (typeof error?.message === "string" && error.message.trim()) {
        return error.message;
    }
    return fallback;
}

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
    const user = useAuthStore((state) => state.user);

    const [currentPlan, setCurrentPlan] = useState<WeeklyWorkoutPlan | null>(null);
    const [selectedDay, setSelectedDay] = useState(0);
    const [completions, setCompletions] = useState<WorkoutCompletion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadWorkoutPlan = useCallback(async () => {
        if (!user?.id) {
            setCurrentPlan(null);
            setCompletions([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const plan = await fetchWorkoutPlan(user.id);
            setCurrentPlan(plan);
            if (plan?.id) {
                const completionRecords = await fetchWorkoutCompletions(plan.id);
                setCompletions(completionRecords);
            } else {
                setCompletions([]);
            }
            setSelectedDay(0);
        } catch (err: any) {
            setError(toErrorMessage(err, "Failed to load workout plan."));
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    const generateNewPlan = useCallback(
        async (options?: WorkoutGenerationOptions) => {
            if (!user?.id) {
                setError("You must be logged in to generate a workout plan.");
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const plan = await generateWorkoutPlan(user.id, {
                    forceRegenerate: options?.forceRegenerate ?? false,
                    preferredSplit: options?.preferredSplit ?? null,
                    dayStates: options?.dayStates ?? null,
                });
                setCurrentPlan(plan);
                if (plan?.id) {
                    const completionRecords = await fetchWorkoutCompletions(plan.id);
                    setCompletions(completionRecords);
                } else {
                    setCompletions([]);
                }
                setSelectedDay(0);
            } catch (err: any) {
                setError(toErrorMessage(err, "Failed to generate workout plan."));
            } finally {
                setLoading(false);
            }
        },
        [user?.id]
    );

    const completeWorkout = useCallback(
        async (date: string, dayOfWeek: number, exerciseId?: string) => {
            if (!user?.id || !currentPlan?.id) {
                setError("No active workout plan to complete.");
                return;
            }

            const existing = completions.find((item) => {
                const existingExerciseId = item.exercise_id ?? null;
                const targetExerciseId = exerciseId ?? null;

                return item.day_of_week === dayOfWeek && existingExerciseId === targetExerciseId;
            });
            if (existing) {
                return;
            }

            setError(null);
            try {
                const completion = await markWorkoutComplete(user.id, currentPlan.id, date, dayOfWeek, exerciseId);
                setCompletions((prev) => [...prev, completion]);
            } catch (err: any) {
                setError(toErrorMessage(err, "Failed to mark workout complete."));
            }
        },
        [user?.id, currentPlan?.id, completions]
    );

    const undoWorkout = useCallback(
        async (date: string, dayOfWeek: number, exerciseId?: string) => {
            if (!user?.id || !currentPlan?.id) {
                setError("No active workout plan to update.");
                return;
            }

            const targetIndex = completions.findIndex((item) => {
                const existingExerciseId = item.exercise_id ?? null;
                const targetExerciseId = exerciseId ?? null;
                return item.day_of_week === dayOfWeek && existingExerciseId === targetExerciseId;
            });

            if (targetIndex < 0) {
                return;
            }

            const targetCompletion = completions[targetIndex];

            setError(null);
            try {
                await undoWorkoutComplete(currentPlan.id, date, dayOfWeek, exerciseId);
                setCompletions((prev) => prev.filter((item) => item.id !== targetCompletion.id));
            } catch (err: any) {
                setError(toErrorMessage(err, "Failed to undo workout completion."));
            }
        },
        [user?.id, currentPlan?.id, completions]
    );

    const selectDay = useCallback((dayIndex: number) => {
        setSelectedDay(dayIndex);
    }, []);

    useEffect(() => {
        void loadWorkoutPlan();
    }, [loadWorkoutPlan]);

    const completedExercisesByDay = useMemo(() => buildExerciseCompletionMap(completions), [completions]);

    const completedDays = useMemo(() => {
        if (!currentPlan) {
            return {};
        }

        return currentPlan.daily_workouts.reduce<Record<number, boolean>>((acc, day) => {
            if (day.is_rest_day) {
                return acc;
            }

            const hasDayCompletion = completions.some(
                (item) => item.day_of_week === day.day_of_week && !item.exercise_id
            );

            if (hasDayCompletion) {
                acc[day.day_of_week] = true;
                return acc;
            }

            const dayExercises = day.exercises ?? [];
            if (dayExercises.length === 0) {
                acc[day.day_of_week] = false;
                return acc;
            }

            const exerciseCompletionMap = completedExercisesByDay[day.day_of_week] ?? {};
            acc[day.day_of_week] = dayExercises.every((exercise) => Boolean(exerciseCompletionMap[exercise.id]));
            return acc;
        }, {});
    }, [currentPlan, completions, completedExercisesByDay]);

    const completedCount = useMemo(
        () => Object.values(completedDays).filter(Boolean).length,
        [completedDays]
    );

    const value = useMemo<WorkoutContextValue>(
        () => ({
            currentPlan,
            selectedDay,
            completions,
            loading,
            error,
            completedDays,
            completedExercisesByDay,
            completedCount,
            loadWorkoutPlan,
            generateNewPlan,
            completeWorkout,
            undoWorkout,
            selectDay,
        }),
        [
            currentPlan,
            selectedDay,
            completions,
            loading,
            error,
            completedDays,
            completedExercisesByDay,
            completedCount,
            loadWorkoutPlan,
            generateNewPlan,
            completeWorkout,
            undoWorkout,
            selectDay,
        ]
    );

    return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkoutContext(): WorkoutContextValue {
    const context = useContext(WorkoutContext);
    if (!context) {
        throw new Error("useWorkoutContext must be used within a WorkoutProvider");
    }
    return context;
}
