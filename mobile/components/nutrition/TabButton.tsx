import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { theme } from "@/constants/theme";

interface TabButtonProps {
    label: string;
    active: boolean;
    onPress: () => void;
}

export function TabButton({ label, active, onPress }: TabButtonProps) {
    return (
        <Pressable style={[styles.tab, active && styles.activeTab]} onPress={onPress}>
            <Text style={[styles.text, active && styles.activeText]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    tab: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: "center",
        backgroundColor: theme.colors.background.secondary,
    },
    activeTab: {
        backgroundColor: theme.colors.background.elevated,
        ...theme.glow.subtle,
    },
    text: {
        color: theme.colors.text.muted,
        fontWeight: "600",
        fontSize: 13,
    },
    activeText: {
        color: theme.colors.green.primary,
    },
});
