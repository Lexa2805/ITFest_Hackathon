import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import type { DayTrainingState } from "@/types/workout";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type PresetId = "balanced" | "push_pull_legs" | "recovery_first";

interface WeeklyScheduleSelectorProps {
    initialDayStates?: Record<number, DayTrainingState>;
    onSave: (payload: {
        dayStates: Record<number, DayTrainingState>;
        source: "preset" | "manual";
        presetId: PresetId | null;
    }) => Promise<void> | void;
    saving?: boolean;
}

function cycleDayState(current: DayTrainingState): DayTrainingState {
    return current === "gym" ? "rest" : "gym";
}

function normalizeStates(states?: Record<number, DayTrainingState>): Record<number, DayTrainingState> {
    return Array.from({ length: 7 }, (_, day) => day).reduce<Record<number, DayTrainingState>>((acc, day) => {
        const value = states?.[day];
        acc[day] = value === "gym" ? "gym" : "rest";
        return acc;
    }, {});
}

export function WeeklyScheduleSelector({ initialDayStates, onSave, saving = false }: WeeklyScheduleSelectorProps) {
    const [dayStates, setDayStates] = useState<Record<number, DayTrainingState>>(normalizeStates(initialDayStates));

    useEffect(() => {
        setDayStates(normalizeStates(initialDayStates));
    }, [initialDayStates]);

    const summary = useMemo(() => {
        const result = { gym: 0, rest: 0 };
        Object.values(dayStates).forEach((state) => {
            if (state === "gym") {
                result.gym += 1;
            } else {
                result.rest += 1;
            }
        });
        return result;
    }, [dayStates]);

    const handleDayToggle = (dayIndex: number) => {
        setDayStates((prev) => ({
            ...prev,
            [dayIndex]: cycleDayState(prev[dayIndex]),
        }));
    };

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Schedule Your Week</Text>
                <Text style={styles.subtitle}>Tap days to toggle between workout and rest.</Text>
            </View>

            <View style={styles.daysGrid}>
                {DAY_LABELS.map((label, index) => {
                    const state = dayStates[index] ?? "rest";
                    return (
                        <Pressable
                            key={label}
                            style={[
                                styles.dayCard,
                                state === "gym" && styles.dayCardGym,
                                state === "rest" && styles.dayCardRest,
                            ]}
                            onPress={() => handleDayToggle(index)}
                            accessibilityRole="button"
                            accessibilityLabel={`Set ${label} as ${state === "gym" ? "Work" : "Rest"}`}
                        >
                            <Text style={[styles.dayLabel, state === "gym" && styles.dayLabelGym]}>{label}</Text>
                            <Text style={[styles.dayState, state === "gym" && styles.dayStateGym]}>
                                {state === "gym" ? "WORKOUT" : "REST"}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>{`${summary.gym} work`}</Text>
                <Text style={styles.summaryText}>{`${summary.rest} rest`}</Text>
            </View>

            <Pressable
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                disabled={saving}
                onPress={() => onSave({ dayStates, source: "manual", presetId: null as PresetId | null })}
                accessibilityRole="button"
                accessibilityLabel="Save weekly schedule"
            >
                <Text style={styles.saveText}>{saving ? "Saving..." : "Save days"}</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: theme.radius.lg,
        padding: 16,
        gap: 14,
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.12)",
        ...theme.glow.subtle,
    },
    headerRow: {
        gap: 4,
    },
    title: {
        fontSize: 26,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: "500",
        lineHeight: 18,
        color: theme.colors.text.secondary,
    },
    daysGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    dayCard: {
        width: "31.2%",
        minHeight: 92,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        paddingHorizontal: 6,
        gap: 6,
    },
    dayCardGym: {
        backgroundColor: "rgba(57,255,136,0.14)",
        borderColor: theme.colors.green.primary,
    },
    dayCardRest: {
        backgroundColor: theme.colors.background.main,
        borderColor: theme.colors.ui.divider,
    },
    dayCardRecovery: {
        backgroundColor: "rgba(110,243,165,0.1)",
        borderColor: theme.colors.green.soft,
    },
    dayLabel: {
        fontSize: 22,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    dayLabelGym: {
        color: theme.colors.green.primary,
    },
    dayState: {
        fontSize: 12,
        fontWeight: "700",
        color: theme.colors.text.secondary,
    },
    dayStateGym: {
        color: theme.colors.green.soft,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: theme.radius.md,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 12,
        backgroundColor: theme.colors.background.main,
    },
    summaryText: {
        color: theme.colors.text.secondary,
        fontSize: 12,
        fontWeight: "700",
    },
    saveButton: {
        minHeight: 44,
        borderRadius: theme.radius.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.green.primary,
        ...theme.glow.subtle,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveText: {
        color: theme.colors.background.main,
        fontSize: 15,
        fontWeight: "800",
    },
});
