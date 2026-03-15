import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DayTabsProps {
    selectedDay: number;
    onSelectDay: (dayIndex: number) => void;
    completedDays?: Record<number, boolean>;
    restDays?: Record<number, boolean>;
    recoveryDays?: Record<number, boolean>;
}

export function DayTabs({
    selectedDay,
    onSelectDay,
    completedDays = {},
    restDays = {},
    recoveryDays = {},
}: DayTabsProps) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
            {DAY_LABELS.map((label, index) => {
                const isActive = selectedDay === index;
                const isCompleted = Boolean(completedDays[index]);
                const isRestDay = Boolean(restDays[index]);
                const isRecoveryDay = Boolean(recoveryDays[index]);

                return (
                    <Pressable
                        key={label}
                        style={[
                            styles.tab,
                            isActive && styles.tabActive,
                            isRestDay && !isActive && styles.tabRest,
                            isRecoveryDay && !isActive && styles.tabRecovery,
                        ]}
                        onPress={() => onSelectDay(index)}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${label}`}
                    >
                        <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
                        {isRestDay ? <Text style={[styles.stateLabel, isActive && styles.stateLabelActive]}>Rest</Text> : null}
                        {isRecoveryDay ? <Text style={[styles.stateLabel, isActive && styles.stateLabelActive]}>Rec</Text> : null}
                        {isCompleted ? <View style={styles.completedDot} /> : null}
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 8,
        paddingVertical: 4,
    },
    tab: {
        minWidth: 64,
        minHeight: 48,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.ui.divider,
        backgroundColor: theme.colors.background.secondary,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        flexDirection: "row",
        gap: 6,
    },
    tabActive: {
        backgroundColor: theme.colors.green.primary,
        borderColor: theme.colors.green.primary,
        ...theme.glow.subtle,
    },
    tabRest: {
        borderColor: theme.colors.ui.divider,
        backgroundColor: theme.colors.background.main,
    },
    tabRecovery: {
        borderColor: theme.colors.green.soft,
        backgroundColor: "rgba(110,243,165,0.08)",
    },
    label: {
        fontSize: 13,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    labelActive: {
        color: theme.colors.background.main,
    },
    stateLabel: {
        fontSize: 10,
        fontWeight: "800",
        color: theme.colors.text.muted,
    },
    stateLabelActive: {
        color: theme.colors.background.main,
    },
    completedDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.green.primary,
    },
});
