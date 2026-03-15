import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import type { DayTrainingState } from "@/types/workout";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type PresetId = "balanced" | "push_pull_legs" | "recovery_first";

const PRESETS: Array<{
    id: PresetId;
    title: string;
    subtitle: string;
    dayStates: Record<number, DayTrainingState>;
}> = [
        {
            id: "balanced",
            title: "Balanced 3-Day",
            subtitle: "Simple full-week rhythm",
            dayStates: {
                0: "gym",
                1: "rest",
                2: "gym",
                3: "rest",
                4: "gym",
                5: "recovery",
                6: "rest",
            },
        },
        {
            id: "push_pull_legs",
            title: "Performance 4-Day",
            subtitle: "More gym focus",
            dayStates: {
                0: "gym",
                1: "gym",
                2: "rest",
                3: "gym",
                4: "gym",
                5: "recovery",
                6: "rest",
            },
        },
        {
            id: "recovery_first",
            title: "Recovery First",
            subtitle: "Balanced effort and reset",
            dayStates: {
                0: "gym",
                1: "recovery",
                2: "gym",
                3: "rest",
                4: "gym",
                5: "recovery",
                6: "rest",
            },
        },
    ];

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
    if (current === "gym") {
        return "rest";
    }
    if (current === "rest") {
        return "recovery";
    }
    return "gym";
}

function normalizeStates(states?: Record<number, DayTrainingState>): Record<number, DayTrainingState> {
    return Array.from({ length: 7 }, (_, day) => day).reduce<Record<number, DayTrainingState>>((acc, day) => {
        const value = states?.[day];
        acc[day] = value === "gym" || value === "rest" || value === "recovery" ? value : "rest";
        return acc;
    }, {});
}

function stateLabel(state: DayTrainingState): string {
    if (state === "gym") {
        return "Gym";
    }
    if (state === "recovery") {
        return "Recovery";
    }
    return "Rest";
}

export function WeeklyScheduleSelector({ initialDayStates, onSave, saving = false }: WeeklyScheduleSelectorProps) {
    const [mode, setMode] = useState<"preset" | "manual">("preset");
    const [selectedPreset, setSelectedPreset] = useState<PresetId>("balanced");
    const [dayStates, setDayStates] = useState<Record<number, DayTrainingState>>(normalizeStates(initialDayStates));

    useEffect(() => {
        setDayStates(normalizeStates(initialDayStates));
    }, [initialDayStates]);

    const summary = useMemo(() => {
        const result = { gym: 0, rest: 0, recovery: 0 };
        Object.values(dayStates).forEach((state) => {
            result[state] += 1;
        });
        return result;
    }, [dayStates]);

    const applyPreset = (presetId: PresetId) => {
        setSelectedPreset(presetId);
        setDayStates(PRESETS.find((preset) => preset.id === presetId)?.dayStates ?? PRESETS[0].dayStates);
    };

    const handleDayToggle = (dayIndex: number) => {
        setMode("manual");
        setDayStates((prev) => ({
            ...prev,
            [dayIndex]: cycleDayState(prev[dayIndex]),
        }));
    };

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Training Week</Text>
                <Text style={styles.subtitle}>Choose a full structure or customize day-by-day.</Text>
            </View>

            <View style={styles.modeRow}>
                <Pressable
                    style={[styles.modeButton, mode === "preset" && styles.modeButtonActive]}
                    onPress={() => setMode("preset")}
                    accessibilityRole="button"
                    accessibilityLabel="Use quick preset mode"
                >
                    <Text style={[styles.modeText, mode === "preset" && styles.modeTextActive]}>Quick presets</Text>
                </Pressable>
                <Pressable
                    style={[styles.modeButton, mode === "manual" && styles.modeButtonActive]}
                    onPress={() => setMode("manual")}
                    accessibilityRole="button"
                    accessibilityLabel="Use manual day configuration"
                >
                    <Text style={[styles.modeText, mode === "manual" && styles.modeTextActive]}>Manual days</Text>
                </Pressable>
            </View>

            {mode === "preset" ? (
                <View style={styles.presetList}>
                    {PRESETS.map((preset) => {
                        const isActive = selectedPreset === preset.id;
                        return (
                            <Pressable
                                key={preset.id}
                                style={[styles.presetCard, isActive && styles.presetCardActive]}
                                onPress={() => applyPreset(preset.id)}
                                accessibilityRole="button"
                                accessibilityLabel={`Select ${preset.title} preset`}
                            >
                                <Text style={[styles.presetTitle, isActive && styles.presetTitleActive]}>{preset.title}</Text>
                                <Text style={[styles.presetSubtitle, isActive && styles.presetSubtitleActive]}>{preset.subtitle}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            ) : null}

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
                                state === "recovery" && styles.dayCardRecovery,
                            ]}
                            onPress={() => handleDayToggle(index)}
                            accessibilityRole="button"
                            accessibilityLabel={`Set ${label} as ${stateLabel(state)}`}
                        >
                            <Text style={[styles.dayLabel, state === "gym" && styles.dayLabelGym]}>{label}</Text>
                            <Text style={[styles.dayState, state === "gym" && styles.dayStateGym]}>{stateLabel(state)}</Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>{`${summary.gym} gym`}</Text>
                <Text style={styles.summaryText}>{`${summary.recovery} recovery`}</Text>
                <Text style={styles.summaryText}>{`${summary.rest} rest`}</Text>
            </View>

            <Pressable
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                disabled={saving}
                onPress={() => onSave({ dayStates, source: mode, presetId: mode === "preset" ? selectedPreset : null })}
                accessibilityRole="button"
                accessibilityLabel="Save weekly schedule"
            >
                <Text style={styles.saveText}>{saving ? "Saving schedule..." : "Save weekly schedule"}</Text>
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
        borderColor: "rgba(57,255,136,0.1)",
    },
    headerRow: {
        gap: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: "500",
        lineHeight: 18,
        color: theme.colors.text.secondary,
    },
    modeRow: {
        flexDirection: "row",
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.ui.divider,
        padding: 4,
        gap: 6,
        backgroundColor: theme.colors.background.main,
    },
    modeButton: {
        flex: 1,
        minHeight: 38,
        borderRadius: theme.radius.full,
        alignItems: "center",
        justifyContent: "center",
    },
    modeButtonActive: {
        backgroundColor: theme.colors.green.primary,
    },
    modeText: {
        fontSize: 12,
        fontWeight: "700",
        color: theme.colors.text.secondary,
    },
    modeTextActive: {
        color: theme.colors.background.main,
    },
    presetList: {
        gap: 8,
    },
    presetCard: {
        backgroundColor: theme.colors.background.main,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.ui.divider,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 2,
    },
    presetCardActive: {
        borderColor: theme.colors.green.primary,
        backgroundColor: "rgba(57,255,136,0.08)",
        shadowColor: theme.colors.green.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    presetTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    presetTitleActive: {
        color: theme.colors.green.soft,
    },
    presetSubtitle: {
        fontSize: 12,
        color: theme.colors.text.muted,
    },
    presetSubtitleActive: {
        color: theme.colors.text.secondary,
    },
    daysGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    dayCard: {
        width: "30.9%",
        minHeight: 62,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        paddingHorizontal: 6,
        gap: 2,
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
        fontSize: 12,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    dayLabelGym: {
        color: theme.colors.green.primary,
    },
    dayState: {
        fontSize: 11,
        fontWeight: "600",
        color: theme.colors.text.secondary,
    },
    dayStateGym: {
        color: theme.colors.green.soft,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: theme.radius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
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
        fontSize: 14,
        fontWeight: "800",
    },
});
