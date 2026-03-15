import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { WeeklyScheduleSelector } from "@/components/workout/WeeklyScheduleSelector";
import { useWorkoutContext } from "@/contexts/WorkoutContext";
import { useProfileContext } from "@/contexts/ProfileContext";
import {
    createScheduleFromDayStates,
    createScheduleFromPreset,
    loadWorkoutSchedule,
    saveWorkoutSchedule,
} from "@/services/workoutScheduleStorage";
import { recommendWorkoutPlan } from "@/services/workoutPlanGenerator";
import { theme } from "@/constants/theme";
import type { DailyWorkout, DayTrainingState, Exercise, WeeklyTrainingSchedule } from "@/types/workout";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function addDays(isoDate: string, offset: number): string {
    const base = new Date(isoDate);
    base.setDate(base.getDate() + offset);
    return base.toISOString().slice(0, 10);
}

function buildExerciseExplanation(exercise: Exercise): string[] {
    if (exercise.execution_steps.length > 0) {
        return exercise.execution_steps;
    }

    return [`Do ${exercise.sets} sets of ${exercise.reps} reps with ${exercise.rest_seconds}s rest.`];
}

export default function WorkoutScreen() {
    const router = useRouter();
    const { profile, updateProfile } = useProfileContext();
    const {
        currentPlan,
        selectedDay,
        loading,
        error,
        completions,
        completedDays,
        completedExercisesByDay,
        completedCount,
        selectDay,
        generateNewPlan,
        completeWorkout,
        undoWorkout,
    } = useWorkoutContext();

    const [trainingSchedule, setTrainingSchedule] = useState<WeeklyTrainingSchedule | null>(null);
    const [savingSchedule, setSavingSchedule] = useState(false);

    const hasRequiredWorkoutProfile = useMemo(
        () => Boolean(profile?.experience_level && profile?.available_days_per_week),
        [profile?.experience_level, profile?.available_days_per_week]
    );

    const displayWorkouts: DailyWorkout[] = useMemo(() => {
        if (!currentPlan) {
            return [];
        }

        const byDay = currentPlan.daily_workouts.reduce<Record<number, DailyWorkout>>((acc, day) => {
            acc[day.day_of_week] = day;
            return acc;
        }, {});

        const normalized = Array.from({ length: 7 }, (_, dayIndex) => {
            return (
                byDay[dayIndex] ?? {
                    day_of_week: dayIndex,
                    muscle_group: null,
                    is_rest_day: true,
                    exercises: [],
                }
            );
        });

        return normalized;
    }, [currentPlan]);

    const selectedWorkout: DailyWorkout | null = useMemo(() => {
        return displayWorkouts.find((day) => day.day_of_week === selectedDay) ?? displayWorkouts[0] ?? null;
    }, [displayWorkouts, selectedDay]);

    const recommendation = useMemo(() => {
        return recommendWorkoutPlan(profile, trainingSchedule?.day_states);
    }, [profile, trainingSchedule?.day_states]);

    const scheduleSummary = useMemo(() => {
        const source = trainingSchedule?.day_states;
        if (source) {
            const trainingDays = Array.from({ length: 7 }, (_, dayIndex) => dayIndex).filter(
                (dayIndex) => source[dayIndex] === "gym"
            ).length;

            return {
                trainingDays,
                restDays: 7 - trainingDays,
            };
        }

        const trainingDays = displayWorkouts.filter((day) => !day.is_rest_day).length;
        return {
            trainingDays,
            restDays: 7 - trainingDays,
        };
    }, [displayWorkouts, trainingSchedule?.day_states]);

    const totalWorkoutDays = useMemo(() => {
        if (!currentPlan) {
            return 0;
        }
        return displayWorkouts.filter((day) => !day.is_rest_day).length;
    }, [currentPlan, displayWorkouts]);

    const workoutDays = useMemo(() => {
        return displayWorkouts.filter((day) => !day.is_rest_day);
    }, [displayWorkouts]);

    const selectedWorkoutExercises = useMemo(() => {
        if (!selectedWorkout || selectedWorkout.is_rest_day) {
            return [];
        }

        return selectedWorkout.exercises;
    }, [selectedWorkout]);

    useEffect(() => {
        if (!workoutDays.length) {
            return;
        }

        const selectedIsWorkoutDay = workoutDays.some((day) => day.day_of_week === selectedDay);
        if (!selectedIsWorkoutDay) {
            selectDay(workoutDays[0].day_of_week);
        }
    }, [selectedDay, selectDay, workoutDays]);

    useEffect(() => {
        if (!profile?.user_id) {
            setTrainingSchedule(null);
            return;
        }

        let isMounted = true;

        void loadWorkoutSchedule(profile.user_id).then((stored) => {
            if (!isMounted) {
                return;
            }

            if (stored) {
                setTrainingSchedule(stored);
                return;
            }

            const fallback = createScheduleFromPreset(profile.user_id, "balanced");
            setTrainingSchedule(fallback);
        });

        return () => {
            isMounted = false;
        };
    }, [profile?.user_id]);

    const syncAvailableDaysToProfile = useCallback(
        async (gymDaysCount: number) => {
            if (!profile) {
                return;
            }

            await updateProfile({
                name: profile.name,
                email: profile.email,
                weight: profile.weight,
                height: profile.height,
                age: profile.age,
                gender: profile.gender,
                activity_level: profile.activity_level,
                goal: profile.goal,
                experience_level: profile.experience_level,
                available_days_per_week: gymDaysCount,
                has_apple_watch: profile.has_apple_watch,
                weekly_budget: profile.weekly_budget,
            });
        },
        [profile, updateProfile]
    );

    const handleSaveSchedule = useCallback(
        async (payload: {
            dayStates: Record<number, DayTrainingState>;
            source: "preset" | "manual";
            presetId: "balanced" | "push_pull_legs" | "recovery_first" | null;
        }) => {
            if (!profile?.user_id) {
                return;
            }

            setSavingSchedule(true);
            try {
                const schedule = createScheduleFromDayStates(profile.user_id, payload.dayStates, payload.source, payload.presetId);
                await saveWorkoutSchedule(schedule);
                setTrainingSchedule(schedule);
                await syncAvailableDaysToProfile(schedule.gym_days.length);

                const nextRecommendation = recommendWorkoutPlan(profile, schedule.day_states);
                await generateNewPlan({
                    preferredSplit: nextRecommendation.splitType,
                    dayStates: schedule.day_states,
                    forceRegenerate: true,
                });
            } finally {
                setSavingSchedule(false);
            }
        },
        [generateNewPlan, profile, profile?.user_id, syncAvailableDaysToProfile]
    );

    const handleCompleteWorkout = async (exerciseId?: string) => {
        if (!currentPlan) {
            return;
        }

        const workoutDate = addDays(currentPlan.week_start_date, selectedDay);
        if (exerciseId) {
            const isExerciseCompleted = Boolean(completedExercisesByDay[selectedDay]?.[exerciseId]);
            if (isExerciseCompleted) {
                await undoWorkout(workoutDate, selectedDay, exerciseId);
                return;
            }

            await completeWorkout(workoutDate, selectedDay, exerciseId);
            return;
        }

        const hasDayCompletionRecord = completions.some(
            (item) => item.day_of_week === selectedDay && !item.exercise_id
        );

        if (hasDayCompletionRecord) {
            await undoWorkout(workoutDate, selectedDay);
            return;
        }

        await completeWorkout(workoutDate, selectedDay);
    };

    const completedExercisesForSelectedDay = completedExercisesByDay[selectedDay] ?? {};
    const hasSelectedDayCompletionRecord = completions.some(
        (item) => item.day_of_week === selectedDay && !item.exercise_id
    );

    const handleGenerateAiPlan = useCallback(() => {
        void generateNewPlan({
            forceRegenerate: true,
            preferredSplit: recommendation.splitType,
            dayStates: trainingSchedule?.day_states,
        });
    }, [generateNewPlan, recommendation.splitType, trainingSchedule?.day_states]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroCard}>
                    <Text style={styles.title}>FitPlan AI</Text>
                    <Text style={styles.progress}>
                        {currentPlan ? `${completedCount}/${totalWorkoutDays} workout days done` : "Plan your perfect workout week"}
                    </Text>
                    <Text style={styles.heroSubtext}>
                        Select your training days and let AI generate a full 7-day split with detailed exercise guidance.
                    </Text>
                </View>

                <WeeklyScheduleSelector
                    initialDayStates={trainingSchedule?.day_states}
                    onSave={handleSaveSchedule}
                    saving={savingSchedule}
                />

                <View style={styles.recommendationInline}>
                    <Text style={styles.recommendationInlineText}>{`AI split: ${recommendation.label}`}</Text>
                </View>

                <Pressable
                    style={[styles.generateButton, (loading || savingSchedule || !hasRequiredWorkoutProfile) && styles.generateButtonDisabled]}
                    disabled={loading || savingSchedule || !hasRequiredWorkoutProfile}
                    onPress={handleGenerateAiPlan}
                    accessibilityRole="button"
                    accessibilityLabel="Generate AI workout plan"
                >
                    <Text style={styles.generateButtonText}>{loading ? "Generating..." : "Generate AI Workout Plan"}</Text>
                </Pressable>

                <Text style={styles.scheduleSummaryText}>{`${scheduleSummary.trainingDays} training day${scheduleSummary.trainingDays === 1 ? "" : "s"} · ${scheduleSummary.restDays} rest day${scheduleSummary.restDays === 1 ? "" : "s"}`}</Text>

                {!hasRequiredWorkoutProfile ? (
                    <View style={styles.messageCard}>
                        <Text style={styles.messageTitle}>Complete your profile first</Text>
                        <Text style={styles.messageBody}>
                            Add your experience level and available training days to generate a personalized split.
                        </Text>
                        <Pressable style={styles.actionButton} onPress={() => router.push("/(tabs)/profile")}>
                            <Text style={styles.actionButtonText}>Go to profile</Text>
                        </Pressable>
                    </View>
                ) : null}

                {!currentPlan && hasRequiredWorkoutProfile ? (
                    <View style={styles.messageCard}>
                        <Text style={styles.messageTitle}>No workout plan yet</Text>
                        <Text style={styles.messageBody}>Tap “Generate AI Workout Plan” to build your full weekly split.</Text>
                    </View>
                ) : null}

                {error ? (
                    <View style={styles.errorCard}>
                        <Text style={styles.errorTitle}>Couldn’t complete that action</Text>
                        <Text style={styles.errorText}>{error}</Text>
                        <Pressable
                            style={styles.errorAction}
                            onPress={() => {
                                void generateNewPlan({
                                    preferredSplit: recommendation.splitType,
                                    dayStates: trainingSchedule?.day_states,
                                });
                            }}
                        >
                            <Text style={styles.errorActionText}>Retry generation</Text>
                        </Pressable>
                    </View>
                ) : null}

                {currentPlan ? (
                    <>
                        <View style={styles.workoutDaysCard}>
                            <Text style={styles.workoutDaysTitle}>Workout Days</Text>
                            <View style={styles.workoutDaysWrap}>
                                {workoutDays.map((day) => (
                                    <Pressable
                                        key={`work-day-${day.day_of_week}`}
                                        style={[
                                            styles.workoutDayButton,
                                            selectedDay === day.day_of_week && styles.workoutDayButtonActive,
                                        ]}
                                        onPress={() => selectDay(day.day_of_week)}
                                    >
                                        <Text
                                            style={[
                                                styles.workoutDayButtonText,
                                                selectedDay === day.day_of_week && styles.workoutDayButtonTextActive,
                                            ]}
                                        >
                                            {DAY_LABELS[day.day_of_week]}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {selectedWorkout?.muscle_group ? (
                            <Text style={styles.muscleGroupLabel}>{`Focus: ${selectedWorkout.muscle_group}`}</Text>
                        ) : null}

                        <View style={styles.exerciseList}>
                            <Pressable
                                style={styles.completeDayButton}
                                onPress={() => {
                                    void handleCompleteWorkout();
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Mark whole day completed"
                            >
                                <Text style={styles.completeDayButtonText}>
                                    {hasSelectedDayCompletionRecord ? "Undo day completion" : "Complete whole day"}
                                </Text>
                            </Pressable>

                            {selectedWorkoutExercises.length === 0 ? (
                                <View style={styles.messageCard}>
                                    <Text style={styles.messageTitle}>No exercises for this day</Text>
                                    <Text style={styles.messageBody}>Generate again or choose another workout day.</Text>
                                </View>
                            ) : (
                                <View style={styles.selectedDayTextCard}>
                                    <Text style={styles.selectedDayTextTitle}>{`${DAY_LABELS[selectedDay]} Exercises`}</Text>
                                    {selectedWorkoutExercises.map((exercise) => (
                                        <Pressable
                                            key={exercise.id}
                                            style={styles.selectedDayExerciseRow}
                                            onPress={() => {
                                                void handleCompleteWorkout(exercise.id);
                                            }}
                                        >
                                            <View style={styles.selectedDayExerciseTextWrap}>
                                                <Text style={styles.selectedDayExerciseName}>{exercise.name}</Text>
                                                {buildExerciseExplanation(exercise).map((step, stepIndex) => (
                                                    <Text
                                                        key={`today-step-${exercise.id}-${stepIndex}`}
                                                        style={styles.selectedDayExerciseStep}
                                                    >
                                                        {`${stepIndex + 1}. ${step}`}
                                                    </Text>
                                                ))}
                                            </View>
                                            <Text style={styles.selectedDayExerciseToggle}>
                                                {Boolean(completedExercisesForSelectedDay[exercise.id]) ? "✓" : "○"}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>
                    </>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background.main,
    },
    content: {
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 88,
        gap: 10,
    },
    heroCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 14,
        gap: 4,
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.1)",
        ...theme.glow.subtle,
    },
    title: {
        fontSize: 26,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    progress: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.green.primary,
    },
    heroSubtext: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: "500",
        color: theme.colors.text.secondary,
    },
    recommendationInline: {
        borderRadius: theme.radius.md,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.08)",
    },
    recommendationInlineText: {
        fontSize: 12,
        fontWeight: "700",
        color: theme.colors.green.soft,
    },
    generateButton: {
        minHeight: 50,
        borderRadius: theme.radius.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.green.primary,
        ...theme.glow.primary,
    },
    generateButtonDisabled: {
        opacity: 0.65,
    },
    generateButtonText: {
        color: theme.colors.background.main,
        fontSize: 16,
        fontWeight: "800",
    },
    scheduleSummaryText: {
        fontSize: 13,
        fontWeight: "600",
        color: theme.colors.text.secondary,
        textAlign: "center",
    },
    exerciseList: {
        gap: 10,
    },
    messageCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 14,
        gap: 6,
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.08)",
    },
    messageTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    messageBody: {
        fontSize: 13,
        fontWeight: "500",
        lineHeight: 18,
        color: theme.colors.text.secondary,
    },
    actionButton: {
        marginTop: 6,
        minHeight: 44,
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.green.primary,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        alignSelf: "flex-start",
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.background.main,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 13,
        fontWeight: "600",
        lineHeight: 18,
    },
    errorCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 14,
        gap: 8,
        borderWidth: 1,
        borderColor: "rgba(255,82,82,0.35)",
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    errorAction: {
        alignSelf: "flex-start",
        minHeight: 38,
        borderRadius: theme.radius.full,
        paddingHorizontal: 12,
        justifyContent: "center",
        borderWidth: 1,
        borderColor: theme.colors.error,
        backgroundColor: "rgba(255,82,82,0.08)",
    },
    errorActionText: {
        fontSize: 12,
        fontWeight: "700",
        color: theme.colors.error,
    },
    completeDayButton: {
        minHeight: 38,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.green.primary,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        backgroundColor: "rgba(57,255,136,0.08)",
        alignSelf: "flex-start",
    },
    completeDayButtonText: {
        fontSize: 12,
        fontWeight: "700",
        color: theme.colors.green.primary,
    },
    muscleGroupLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: theme.colors.text.secondary,
        textTransform: "capitalize",
    },
    workoutDaysCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.08)",
    },
    workoutDaysTitle: {
        fontSize: 15,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    workoutDaysWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    workoutDayButton: {
        minWidth: 64,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.ui.divider,
        backgroundColor: theme.colors.background.main,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    workoutDayButtonActive: {
        borderColor: theme.colors.green.primary,
        backgroundColor: "rgba(57,255,136,0.16)",
    },
    workoutDayButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.text.secondary,
    },
    workoutDayButtonTextActive: {
        color: theme.colors.green.primary,
    },
    selectedDayTextCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.08)",
    },
    selectedDayTextTitle: {
        fontSize: 15,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    selectedDayExerciseRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.ui.divider,
        backgroundColor: theme.colors.background.main,
        padding: 10,
        gap: 10,
    },
    selectedDayExerciseTextWrap: {
        flex: 1,
        gap: 3,
    },
    selectedDayExerciseName: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.green.soft,
    },
    selectedDayExerciseStep: {
        fontSize: 12,
        fontWeight: "500",
        lineHeight: 17,
        color: theme.colors.text.secondary,
    },
    selectedDayExerciseToggle: {
        fontSize: 22,
        lineHeight: 24,
        color: theme.colors.green.primary,
        fontWeight: "800",
    },
});
