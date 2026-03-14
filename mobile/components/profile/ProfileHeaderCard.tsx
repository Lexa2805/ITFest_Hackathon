import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/constants/theme";

interface Props {
    name?: string | null;
    email?: string | null;
    completion: number;
    avatarUri?: string | null;
    onPressAvatar: () => void;
}

function initialsFromName(name?: string | null): string {
    if (!name?.trim()) return "U";
    const parts = name
        .trim()
        .split(" ")
        .filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function ProfileHeaderCard({ name, email, completion, avatarUri, onPressAvatar }: Props) {
    const initials = useMemo(() => initialsFromName(name), [name]);

    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <Pressable onPress={onPressAvatar} style={styles.avatar}>
                    {avatarUri ? (
                        <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>{initials}</Text>
                    )}
                </Pressable>

                <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.name}>{name?.trim() || "Your Name"}</Text>
                    <Text style={styles.email}>{email || "No email"}</Text>
                    <Text style={styles.hint}>Tap avatar to change</Text>
                </View>
            </View>

            <View style={styles.progressRow}>
                <Text style={styles.progressText}>Profile {completion}% complete</Text>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${completion}%` }]} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 14,
        gap: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(57,255,136,0.12)",
        alignItems: "center",
        justifyContent: "center",
        ...theme.glow.subtle,
    },
    avatarText: {
        color: theme.colors.green.primary,
        fontWeight: "800",
        fontSize: 20,
    },
    avatarImage: {
        width: "100%",
        height: "100%",
        borderRadius: 28,
    },
    name: {
        color: theme.colors.text.primary,
        fontSize: 18,
        fontWeight: "700",
    },
    email: {
        color: theme.colors.text.secondary,
        fontSize: 13,
    },
    hint: {
        color: theme.colors.text.muted,
        fontSize: 12,
    },
    progressRow: {
        gap: 6,
    },
    progressText: {
        color: theme.colors.text.secondary,
        fontSize: 12,
        fontWeight: "600",
    },
    progressTrack: {
        height: 8,
        borderRadius: 8,
        backgroundColor: theme.colors.background.main,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: theme.colors.green.primary,
        borderRadius: 8,
    },
});
