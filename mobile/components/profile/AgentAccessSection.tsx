import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/constants/theme";

const WARNING_COLOR = "#FFD166";

export interface AgentItem {
    key: string;
    title: string;
    description: string;
    status: "Active" | "Not configured";
    onPress: () => void;
}

function StatusBadge({ status }: { status: AgentItem["status"] }) {
    const active = status === "Active";
    const color = active ? theme.colors.green.primary : WARNING_COLOR;
    return (
        <View style={[styles.badge, { borderColor: color }]}>
            <Text style={[styles.badgeText, { color }]}>{status}</Text>
        </View>
    );
}

function AgentCard({ item }: { item: AgentItem }) {
    return (
        <Pressable style={styles.card} onPress={item.onPress}>
            <View style={styles.row}>
                <Text style={styles.title}>{item.title}</Text>
                <StatusBadge status={item.status} />
            </View>
            <Text style={styles.description}>{item.description}</Text>
        </Pressable>
    );
}

export function AgentAccessSection({ items }: { items: AgentItem[] }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your AI Assistants</Text>
            <Text style={styles.sectionSubtitle}>Tap a card to open that assistant workflow.</Text>
            <View style={styles.list}>
                {items.map((item) => (
                    <AgentCard key={item.key} item={item} />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        gap: 6,
    },
    sectionTitle: {
        color: theme.colors.text.primary,
        fontSize: 20,
        fontWeight: "800",
    },
    sectionSubtitle: {
        color: theme.colors.text.muted,
        fontSize: 12,
        marginBottom: 2,
    },
    list: {
        gap: 10,
    },
    card: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.sm,
        padding: 12,
        gap: 7,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
    },
    title: {
        color: theme.colors.text.primary,
        fontSize: 15,
        fontWeight: "700",
        flex: 1,
    },
    description: {
        color: theme.colors.text.secondary,
        fontSize: 12,
        lineHeight: 18,
    },
    badge: {
        borderWidth: 1,
        borderRadius: theme.radius.full,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
});
