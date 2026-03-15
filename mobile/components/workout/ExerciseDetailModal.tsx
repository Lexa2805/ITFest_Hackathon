import React from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Exercise } from "@/types/workout";
import { theme } from "@/constants/theme";
import { ExerciseImageView } from "@/components/workout/ExerciseImageView";

interface ExerciseDetailModalProps {
    visible: boolean;
    exercise: Exercise | null;
    currentIndex: number;
    totalCount: number;
    canGoPrevious: boolean;
    canGoNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
    onClose: () => void;
}

export function ExerciseDetailModal({
    visible,
    exercise,
    currentIndex,
    totalCount,
    canGoPrevious,
    canGoNext,
    onPrevious,
    onNext,
    onClose,
}: ExerciseDetailModalProps) {
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <View style={styles.headerTextWrap}>
                        <Text style={styles.positionText}>{totalCount > 0 ? `${currentIndex + 1} of ${totalCount}` : "Exercise"}</Text>
                        <Text style={styles.title}>{exercise?.name ?? "Exercise"}</Text>
                    </View>
                    <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close exercise details">
                        <Text style={styles.closeButtonText}>Close</Text>
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <ExerciseImageView
                        exercise={exercise}
                        height={280}
                        style={styles.image}
                        placeholderLabel="Add an image for this exercise"
                    />

                    <Text style={styles.muscleGroup}>{exercise?.muscle_group ?? "Unknown muscle group"}</Text>

                    <View style={styles.statsCard}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Sets</Text>
                            <Text style={styles.statValue}>{exercise?.sets ?? "-"}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Reps</Text>
                            <Text style={styles.statValue}>{exercise?.reps ?? "-"}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Rest</Text>
                            <Text style={styles.statValue}>{exercise ? `${exercise.rest_seconds}s` : "-"}</Text>
                        </View>
                    </View>

                    {(exercise?.equipment ?? []).length > 0 ? (
                        <View style={styles.equipmentWrap}>
                            <Text style={styles.sectionTitle}>Equipment</Text>
                            <Text style={styles.equipmentText}>{exercise?.equipment.join(" • ")}</Text>
                        </View>
                    ) : null}

                    <View style={styles.stepsWrap}>
                        <Text style={styles.sectionTitle}>Notes & Tips</Text>
                        {(exercise?.execution_steps ?? []).length > 0 ? (
                            exercise?.execution_steps.map((step, index) => (
                                <View key={`${index}-${step}`} style={styles.stepRow}>
                                    <Text style={styles.stepIndex}>{index + 1}.</Text>
                                    <Text style={styles.stepText}>{step}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptySteps}>No notes available for this exercise yet.</Text>
                        )}
                    </View>
                </ScrollView>

                <View style={styles.bottomNavWrap}>
                    <Pressable
                        style={[styles.navButton, !canGoPrevious && styles.navButtonDisabled]}
                        onPress={onPrevious}
                        disabled={!canGoPrevious}
                        accessibilityRole="button"
                        accessibilityLabel="Go to previous exercise"
                    >
                        <Text style={[styles.navButtonText, !canGoPrevious && styles.navButtonTextDisabled]}>Previous</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.navButton, styles.navButtonPrimary, !canGoNext && styles.navButtonDisabled]}
                        onPress={onNext}
                        disabled={!canGoNext}
                        accessibilityRole="button"
                        accessibilityLabel="Go to next exercise"
                    >
                        <Text style={[styles.navButtonText, styles.navButtonTextPrimary, !canGoNext && styles.navButtonTextDisabled]}>Next</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background.elevated,
    },
    header: {
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    headerTextWrap: {
        flex: 1,
        gap: 2,
    },
    positionText: {
        fontSize: 12,
        fontWeight: "700",
        color: theme.colors.green.soft,
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    closeButton: {
        minWidth: 72,
        minHeight: 44,
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.green.primary,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    closeButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.background.main,
    },
    content: {
        paddingHorizontal: 18,
        paddingBottom: 20,
        gap: 14,
    },
    image: {
        borderRadius: theme.radius.lg,
    },
    muscleGroup: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.text.secondary,
        textTransform: "capitalize",
    },
    statsCard: {
        borderRadius: theme.radius.md,
        padding: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.1)",
    },
    statItem: {
        alignItems: "center",
        gap: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: theme.colors.text.muted,
    },
    statValue: {
        fontSize: 18,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    equipmentWrap: {
        gap: 6,
    },
    equipmentText: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        lineHeight: 20,
    },
    stepsWrap: {
        gap: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    stepRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    stepIndex: {
        fontSize: 16,
        color: theme.colors.green.primary,
        fontWeight: "700",
        minWidth: 18,
    },
    stepText: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.text.primary,
        lineHeight: 22,
    },
    emptySteps: {
        color: theme.colors.text.muted,
        fontSize: 15,
    },
    bottomNavWrap: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.ui.divider,
        backgroundColor: theme.colors.background.elevated,
    },
    navButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.ui.divider,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.background.secondary,
    },
    navButtonPrimary: {
        backgroundColor: theme.colors.green.primary,
        borderColor: theme.colors.green.primary,
        ...theme.glow.subtle,
    },
    navButtonDisabled: {
        opacity: 0.45,
    },
    navButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.text.secondary,
    },
    navButtonTextPrimary: {
        color: theme.colors.background.main,
    },
    navButtonTextDisabled: {
        color: theme.colors.text.muted,
    },
});
