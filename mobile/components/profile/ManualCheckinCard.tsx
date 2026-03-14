import React from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { theme } from "@/constants/theme";

interface Props {
    heartRate: string;
    sleepHours: string;
    steps: string;
    calories: string;
    mood: number;
    stress: number;
    submitting: boolean;
    onHeartRateChange: (value: string) => void;
    onSleepChange: (value: string) => void;
    onStepsChange: (value: string) => void;
    onCaloriesChange: (value: string) => void;
    onMoodChange: (value: number) => void;
    onStressChange: (value: number) => void;
    onSubmit: () => void;
}

const moodEmoji: Record<number, string> = {
    1: "😣",
    2: "😕",
    3: "😐",
    4: "🙂",
    5: "😄",
};

function NumberInput({
    label,
    value,
    placeholder,
    onChangeText,
}: {
    label: string;
    value: string;
    placeholder: string;
    onChangeText: (value: string) => void;
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                value={value}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.text.muted}
                keyboardType="numeric"
                onChangeText={onChangeText}
                style={styles.input}
            />
        </View>
    );
}

function ScaleSelector({
    label,
    value,
    onChange,
    useEmoji = false,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    useEmoji?: boolean;
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.selectorRow}>
                {[1, 2, 3, 4, 5].map((item) => {
                    const selected = item === value;
                    return (
                        <Pressable
                            key={item}
                            onPress={() => onChange(item)}
                            style={[styles.selectorChip, selected && styles.selectorChipActive]}
                        >
                            <Text style={[styles.selectorText, selected && styles.selectorTextActive]}>
                                {useEmoji ? moodEmoji[item] : item}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

export function ManualCheckinCard(props: Props) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>Daily Check-in</Text>
            <Text style={styles.subtitle}>Enter today&apos;s health metrics manually.</Text>

            <NumberInput
                label="Heart rate (bpm)"
                value={props.heartRate}
                placeholder="e.g. 72"
                onChangeText={props.onHeartRateChange}
            />
            <NumberInput
                label="Hours of sleep"
                value={props.sleepHours}
                placeholder="e.g. 7.5"
                onChangeText={props.onSleepChange}
            />
            <NumberInput
                label="Steps taken today"
                value={props.steps}
                placeholder="e.g. 8450"
                onChangeText={props.onStepsChange}
            />
            <NumberInput
                label="Calories burned (optional)"
                value={props.calories}
                placeholder="e.g. 420"
                onChangeText={props.onCaloriesChange}
            />

            <ScaleSelector label="Mood" value={props.mood} onChange={props.onMoodChange} useEmoji />
            <ScaleSelector label="Stress level" value={props.stress} onChange={props.onStressChange} />

            <Pressable style={styles.submitButton} onPress={props.onSubmit} disabled={props.submitting}>
                {props.submitting ? (
                    <ActivityIndicator size="small" color={theme.colors.background.main} />
                ) : (
                    <Text style={styles.submitText}>Submit today&apos;s data</Text>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 14,
        gap: 10,
    },
    title: {
        color: theme.colors.text.primary,
        fontSize: 18,
        fontWeight: "700",
    },
    subtitle: {
        color: theme.colors.text.secondary,
        fontSize: 12,
        marginBottom: 4,
    },
    field: {
        gap: 6,
    },
    label: {
        color: theme.colors.text.secondary,
        fontSize: 12,
        fontWeight: "600",
    },
    input: {
        backgroundColor: theme.colors.background.main,
        borderRadius: theme.radius.sm,
        color: theme.colors.text.primary,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    selectorRow: {
        flexDirection: "row",
        gap: 8,
    },
    selectorChip: {
        width: 40,
        height: 40,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.background.main,
        alignItems: "center",
        justifyContent: "center",
    },
    selectorChipActive: {
        backgroundColor: theme.colors.background.elevated,
        ...theme.glow.subtle,
    },
    selectorText: {
        color: theme.colors.text.secondary,
        fontSize: 15,
        fontWeight: "700",
    },
    selectorTextActive: {
        color: theme.colors.green.primary,
    },
    submitButton: {
        marginTop: 4,
        backgroundColor: theme.colors.green.primary,
        borderRadius: theme.radius.sm,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 42,
    },
    submitText: {
        color: theme.colors.background.main,
        fontSize: 14,
        fontWeight: "800",
    },
});
