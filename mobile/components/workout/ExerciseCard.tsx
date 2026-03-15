import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import type { Exercise } from "@/types/workout";
import { theme } from "@/constants/theme";
import { ExerciseImageView } from "@/components/workout/ExerciseImageView";

interface ExerciseCardProps {
    exercise: Exercise;
    completed?: boolean;
    onPress?: (exercise: Exercise) => void;
    onToggleComplete?: () => void;
}

export function ExerciseCard({
    exercise,
    completed = false,
    onPress,
    onToggleComplete,
}: ExerciseCardProps) {
    return (
        <Pressable
            style={styles.card}
            onPress={() => onPress?.(exercise)}
            accessibilityRole="button"
            accessibilityLabel={`Open details for ${exercise.name}`}
        >
            <ExerciseImageView
                exercise={exercise}
                height={180}
                style={styles.mediaWrap}
                placeholderLabel="Exercise image coming soon"
            />

            <View style={styles.contentRow}>
                <View style={styles.textWrap}>
                    <Text style={styles.name}>{exercise.name}</Text>
                    <Text style={styles.meta}>{exercise.muscle_group}</Text>
                    <Text style={styles.setsReps}>{`${exercise.sets} sets x ${exercise.reps} reps`}</Text>
                    <Text style={styles.rest}>{`Rest ${exercise.rest_seconds}s`}</Text>
                </View>

                <Pressable
                    style={[styles.completeButton, completed && styles.completeButtonDone]}
                    onPress={onToggleComplete}
                    accessibilityRole="button"
                    accessibilityLabel={completed ? "Workout completed" : "Mark workout completed"}
                >
                    <Text style={[styles.completeText, completed && styles.completeTextDone]}>
                        {completed ? "✓" : "○"}
                    </Text>
                </Pressable>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.08)",
    },
    mediaWrap: {
        borderRadius: 18,
    },
    contentRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    textWrap: {
        flex: 1,
        gap: 4,
    },
    name: {
        fontSize: 18,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    meta: {
        fontSize: 12,
        fontWeight: "600",
        color: theme.colors.green.soft,
        textTransform: "capitalize",
    },
    setsReps: {
        fontSize: 14,
        fontWeight: "600",
        color: theme.colors.text.secondary,
    },
    rest: {
        fontSize: 12,
        fontWeight: "600",
        color: theme.colors.text.muted,
    },
    completeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.background.elevated,
        borderWidth: 1,
        borderColor: theme.colors.green.primary,
    },
    completeButtonDone: {
        backgroundColor: theme.colors.green.primary,
        borderColor: theme.colors.green.primary,
        ...theme.glow.subtle,
    },
    completeText: {
        fontSize: 20,
        lineHeight: 22,
        color: theme.colors.green.primary,
        fontWeight: "800",
    },
    completeTextDone: {
        color: theme.colors.background.main,
    },
});
