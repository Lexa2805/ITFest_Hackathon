import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { DayTabs } from "@/components/workout/DayTabs";
import { ExerciseCard } from "@/components/workout/ExerciseCard";
import { ExerciseDetailModal } from "@/components/workout/ExerciseDetailModal";
import { WeeklyScheduleSelector } from "@/components/workout/WeeklyScheduleSelector";
import { useWorkoutContext } from "@/contexts/WorkoutContext";
import { useProfileContext } from "@/contexts/ProfileContext";
import { fetchExerciseDetails, getWorkoutRecommendations } from "@/services/workoutApi";
import { SkeletonCard } from "@/components/recipe/SkeletonCard";
import {
    createScheduleFromDayStates,
    createScheduleFromPreset,
    loadWorkoutSchedule,
    saveWorkoutSchedule,
} from "@/services/workoutScheduleStorage";
import { recommendWorkoutPlan } from "@/services/workoutPlanGenerator";
import { theme } from "@/constants/theme";
import type { DailyWorkout, DayTrainingState, Exercise, WeeklyTrainingSchedule } from "@/types/workout";
import type { ExerciseRecommendation } from "@/services/workoutApi";

function mapRecommendationToExercise(rec: ExerciseRecommendation): Exercise {
    return {
        id: rec.id,
        name: rec.name,
        muscle_group: rec.target_muscle,
        image: rec.image_url,
        demonstration_url: null,
        execution_steps: rec.execution_steps,
        sets: 3,
        reps: 10,
        rest_seconds: 60,
        difficulty: rec.difficulty as Exercise["difficulty"],
        equipment: rec.equipment,
    };
}

function addDays(isoDate: string, offset: number): string {
    const base = new Date(isoDate);
    base.setDate(base.getDate() + offset);
    return base.toISOString().slice(0, 10);
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

    const [modalVisible, setModalVisible] = useState(false);
    const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
    const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
    const [trainingSchedule, setTrainingSchedule] = useState<WeeklyTrainingSchedule | null>(null);
    const [savingSchedule, setSavingSchedule] = useState(false);

    // ── RAG Recommendations state ──
    const [recommendations, setRecommendations] = useState<ExerciseRecommendation[]>([]);
    const [recsLoading, setRecsLoading] = useState(false);
    const [recsError, setRecsError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const hasRequiredWorkoutProfile = useMemo(
        () => Boolean(profile?.experience_level && profile?.available_days_per_week),
        [profile?.experience_level, profile?.available_days_per_week]
    );

    const loadRecommendations = useCallback(async () => {
        setRecsLoading(true);
        setRecsError(null);
        try {
            const data = await getWorkoutRecommendations({ limit: 10 });
            setRecommendations(data);
        } catch {
            setRecsError("Couldn't load recommendations");
        } finally {
            setRecsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadRecommendations();
    }, [loadRecommendations]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await loadRecommendations();
        } finally {
            setRefreshing(false);
        }
    }, [loadRecommendations]);

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

    const selectedExercises = selectedWorkout?.exercises ?? [];

    const totalWorkoutDays = useMemo(() => {
        if (!currentPlan) {
            return 0;
        }
        return displayWorkouts.filter((day) => !day.is_rest_day).length;
    }, [currentPlan, displayWorkouts]);

    const restDays = useMemo(() => {
        if (trainingSchedule?.day_states) {
            return Array.from({ length: 7 }, (_, day) => day).reduce<Record<number, boolean>>((acc, day) => {
                if (trainingSchedule.day_states[day] === "rest") {
                    acc[day] = true;
                }
                return acc;
            }, {});
        }

        return displayWorkouts.reduce<Record<number, boolean>>((acc, day) => {
            if (day.is_rest_day) {
                acc[day.day_of_week] = true;
            }
            return acc;
        }, {});
    }, [displayWorkouts, trainingSchedule?.day_states]);

    const recoveryDays = useMemo(() => {
        if (!trainingSchedule?.day_states) {
            return {};
        }

        return Array.from({ length: 7 }, (_, day) => day).reduce<Record<number, boolean>>((acc, day) => {
            if (trainingSchedule.day_states[day] === "recovery") {
                acc[day] = true;
            }
            return acc;
        }, {});
    }, [trainingSchedule?.day_states]);

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
            } finally {
                setSavingSchedule(false);
            }
        },
        [profile?.user_id, syncAvailableDaysToProfile]
    );

    const openExerciseDetails = async (exercise: Exercise) => {
        const currentIndex = selectedExercises.findIndex((item) => item.id === exercise.id);
        setActiveExerciseIndex(currentIndex >= 0 ? currentIndex : 0);
        setActiveExercise(exercise);
        setModalVisible(true);
        try {
            const fullDetails = await fetchExerciseDetails(exercise.id);
            setActiveExercise(fullDetails);
        } catch {
            setActiveExercise(exercise);
        }
    };

    const loadExerciseAtIndex = useCallback(
        async (index: number) => {
            if (index < 0 || index >= selectedExercises.length) {
                return;
            }

            const exercise = selectedExercises[index];
            setActiveExerciseIndex(index);
            setActiveExercise(exercise);

            try {
                const fullDetails = await fetchExerciseDetails(exercise.id);
                setActiveExercise((current) => (current?.id === exercise.id ? fullDetails : current));
            } catch {
                setActiveExercise(exercise);
            }
        },
        [selectedExercises]
    );

    const handlePreviousExercise = useCallback(() => {
        void loadExerciseAtIndex(activeExerciseIndex - 1);
    }, [activeExerciseIndex, loadExerciseAtIndex]);

    const handleNextExercise = useCallback(() => {
        void loadExerciseAtIndex(activeExerciseIndex + 1);
    }, [activeExerciseIndex, loadExerciseAtIndex]);

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

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.colors.green.primary}
                        colors={[theme.colors.green.primary]}
                    />
                }
            >
                <View style={styles.heroCard}>
                    <Text style={styles.title}>Weekly Workout</Text>
                    <Text style={styles.progress}>{`${completedCount}/${totalWorkoutDays} workouts completed`}</Text>
                    <Text style={styles.heroSubtext}>Minimal plan view with clear day focus and smooth exercise navigation.</Text>
                </View>

                <View style={styles.flowCard}>
                    <Text style={styles.flowTitle}>Workout Setup Flow</Text>
                    <Text style={styles.flowSubtitle}>Profile / goals → Schedule setup → Recommended split → Weekly plan → Exercise view</Text>

                    <View style={styles.flowStepList}>
                        <View style={styles.flowStepRow}>
                            <Text style={styles.flowStepLabel}>1. Profile / goals</Text>
                            <Text style={styles.flowStepState}>{hasRequiredWorkoutProfile ? "Ready" : "Missing details"}</Text>
                        </View>
                        <View style={styles.flowStepRow}>
                            <Text style={styles.flowStepLabel}>2. Schedule setup</Text>
                            <Text style={styles.flowStepState}>{trainingSchedule ? "Configured" : "Choose days"}</Text>
                        </View>
                        <View style={styles.flowStepRow}>
                            <Text style={styles.flowStepLabel}>3. Recommended split</Text>
                            <Text style={styles.flowStepState}>{recommendation.label}</Text>
                        </View>
                        <View style={styles.flowStepRow}>
                            <Text style={styles.flowStepLabel}>4. Generated weekly plan</Text>
                            <Text style={styles.flowStepState}>{currentPlan ? "Generated" : "Not generated"}</Text>
                        </View>
                        <View style={styles.flowStepRow}>
                            <Text style={styles.flowStepLabel}>5. Exercise-by-exercise view</Text>
                            <Text style={styles.flowStepState}>{selectedExercises.length > 0 ? "Available" : "Waiting for plan"}</Text>
                        </View>
                    </View>
                </View>

                <WeeklyScheduleSelector
                    initialDayStates={trainingSchedule?.day_states}
                    onSave={handleSaveSchedule}
                    saving={savingSchedule}
                />

                <View style={styles.recommendationCard}>
                    <Text style={styles.recommendationTitle}>Recommended split</Text>
                    <Text style={styles.recommendationType}>{recommendation.label}</Text>
                    <Text style={styles.recommendationReason}>{recommendation.rationale}</Text>
                </View>

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
                        <Text style={styles.messageBody}>Generate your weekly split to start training.</Text>
                        <Pressable
                            style={styles.actionButton}
                            onPress={() => {
                                void generateNewPlan({
                                    preferredSplit: recommendation.splitType,
                                    dayStates: trainingSchedule?.day_states,
                                });
                            }}
                        >
                            <Text style={styles.actionButtonText}>{loading ? "Generating..." : "Generate plan"}</Text>
                        </Pressable>
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
                        <DayTabs
                            selectedDay={selectedDay}
                            onSelectDay={selectDay}
                            completedDays={completedDays}
                            restDays={restDays}
                            recoveryDays={recoveryDays}
                        />

                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>Week summary</Text>
                            <View style={styles.summaryMetricsRow}>
                                <Text style={styles.summaryMetric}>{`${totalWorkoutDays} gym`}</Text>
                                <Text style={styles.summaryMetric}>{`${Object.keys(restDays).length} rest`}</Text>
                                <Text style={styles.summaryMetric}>{`${Object.keys(recoveryDays).length} recovery`}</Text>
                            </View>
                            <Text style={styles.summaryCaption}>{`${completedCount} of ${totalWorkoutDays} training days completed`}</Text>
                        </View>

                        {!selectedWorkout?.is_rest_day && selectedWorkout?.muscle_group ? (
                            <Text style={styles.muscleGroupLabel}>
                                {`Focus: ${selectedWorkout.muscle_group}`}
                            </Text>
                        ) : null}

                        {selectedWorkout?.is_rest_day ? (
                            <View style={styles.messageCard}>
                                <Text style={styles.messageTitle}>Rest day</Text>
                                <Text style={styles.messageBody}>Recovery day. Focus on hydration, sleep, and mobility.</Text>
                            </View>
                        ) : (
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

                                {selectedWorkout?.exercises.length === 0 ? (
                                    <View style={styles.messageCard}>
                                        <Text style={styles.messageTitle}>No exercises for this day</Text>
                                        <Text style={styles.messageBody}>Switch to another day or regenerate your plan after updating schedule preferences.</Text>
                                    </View>
                                ) : null}

                                {selectedWorkout?.exercises.map((exercise) => (
                                    <ExerciseCard
                                        key={exercise.id}
                                        exercise={exercise}
                                        completed={Boolean(completedExercisesForSelectedDay[exercise.id])}
                                        onPress={openExerciseDetails}
                                        onToggleComplete={() => {
                                            void handleCompleteWorkout(exercise.id);
                                        }}
                                    />
                                ))}
                            </View>
                        )}
                    </>
                ) : null}

                {/* ── Recommended for you ── */}
                <View style={styles.recsSection}>
                    <Text style={styles.recsSectionTitle}>Recommended for you</Text>

                    {recsLoading && !recommendations.length ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : recsError && !recommendations.length ? (
                        <View style={styles.recsErrorCard}>
                            <Text style={styles.recsErrorText}>{recsError}</Text>
                            <Pressable
                                style={styles.recsRetryButton}
                                onPress={() => void loadRecommendations()}
                                accessibilityRole="button"
                                accessibilityLabel="Retry loading recommendations"
                            >
                                <Text style={styles.recsRetryText}>Retry</Text>
                            </Pressable>
                        </View>
                    ) : recommendations.length > 0 ? (
                        recommendations.map((rec) => (
                            <ExerciseCard
                                key={rec.id}
                                exercise={mapRecommendationToExercise(rec)}
                                onPress={openExerciseDetails}
                            />
                        ))
                    ) : (
                        <View style={styles.messageCard}>
                            <Text style={styles.messageBody}>No recommendations available yet.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <ExerciseDetailModal
                visible={modalVisible}
                exercise={activeExercise}
                currentIndex={activeExerciseIndex}
                totalCount={selectedExercises.length}
                canGoPrevious={activeExerciseIndex > 0}
                canGoNext={activeExerciseIndex < selectedExercises.length - 1}
                onPrevious={handlePreviousExercise}
                onNext={handleNextExercise}
                onClose={() => {
                    setModalVisible(false);
                    setActiveExercise(null);
                }}
            />
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
        paddingTop: 12,
        paddingBottom: 100,
        gap: 14,
    },
    heroCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 16,
        gap: 6,
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.1)",
        ...theme.glow.subtle,
    },
    title: {
        fontSize: 32,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    progress: {
        fontSize: 15,
        fontWeight: "700",
        color: theme.colors.green.primary,
    },
    heroSubtext: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: "500",
        color: theme.colors.text.secondary,
    },
    flowCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.08)",
    },
    flowTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    flowSubtitle: {
        fontSize: 13,
        lineHeight: 18,
        color: theme.colors.text.secondary,
    },
    flowStepList: {
        gap: 8,
    },
    flowStepRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
    flowStepLabel: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.text.secondary,
    },
    flowStepState: {
        fontSize: 13,
        fontWeight: "700",
        color: theme.colors.green.soft,
    },
    recommendationCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 16,
        gap: 6,
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.08)",
    },
    recommendationTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: theme.colors.text.secondary,
        textTransform: "uppercase",
    },
    recommendationType: {
        fontSize: 20,
        fontWeight: "800",
        color: theme.colors.green.primary,
    },
    recommendationReason: {
        fontSize: 13,
        lineHeight: 18,
        color: theme.colors.text.secondary,
    },
    exerciseList: {
        gap: 12,
    },
    summaryCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 14,
        gap: 8,
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.08)",
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    summaryMetricsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    summaryMetric: {
        fontSize: 12,
        fontWeight: "700",
        color: theme.colors.green.soft,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: theme.radius.full,
        backgroundColor: "rgba(57,255,136,0.10)",
    },
    summaryCaption: {
        fontSize: 13,
        color: theme.colors.text.secondary,
    },
    messageCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.08)",
    },
    messageTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    messageBody: {
        fontSize: 14,
        fontWeight: "500",
        lineHeight: 20,
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
        minHeight: 42,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.green.primary,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
        backgroundColor: "rgba(57,255,136,0.08)",
        alignSelf: "flex-start",
    },
    completeDayButtonText: {
        fontSize: 13,
        fontWeight: "700",
        color: theme.colors.green.primary,
    },
    muscleGroupLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: theme.colors.text.secondary,
        textTransform: "capitalize",
    },
    recsSection: {
        gap: 12,
        marginTop: 8,
    },
    recsSectionTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    recsErrorCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 14,
        gap: 8,
        borderWidth: 1,
        borderColor: "rgba(255,82,82,0.35)",
        alignItems: "flex-start",
    },
    recsErrorText: {
        fontSize: 13,
        fontWeight: "600",
        color: theme.colors.error,
    },
    recsRetryButton: {
        minHeight: 38,
        borderRadius: theme.radius.full,
        paddingHorizontal: 12,
        justifyContent: "center",
        borderWidth: 1,
        borderColor: theme.colors.error,
        backgroundColor: "rgba(255,82,82,0.08)",
    },
    recsRetryText: {
        fontSize: 12,
        fontWeight: "700",
        color: theme.colors.error,
    },
});
