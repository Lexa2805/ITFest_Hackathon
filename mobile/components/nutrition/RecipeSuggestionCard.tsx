import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type RecipeSuggestionCardProps = {
    name: string;
    prepTime: string;
    calories: number;
    description: string;
    tag: string;
    ctaLabel?: string;
};

export function RecipeSuggestionCard({
    name,
    prepTime,
    calories,
    description,
    tag,
    ctaLabel = 'View recipe',
}: RecipeSuggestionCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                <Text style={styles.name}>{name}</Text>
                <View style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                </View>
            </View>

            <Text style={styles.meta}>{prepTime} • {calories} kcal</Text>
            <Text style={styles.description}>{description}</Text>

            <Pressable style={styles.ctaButton}>
                <Text style={styles.ctaText}>{ctaLabel}</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: theme.radius.lg,
        padding: 14,
        backgroundColor: theme.colors.background.secondary,
        gap: 8,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    name: {
        flex: 1,
        color: theme.colors.text.primary,
        fontSize: 15,
        fontWeight: '700',
    },
    tagPill: {
        backgroundColor: 'rgba(57,255,136,0.12)',
        borderRadius: theme.radius.full,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    tagText: {
        fontSize: 11,
        color: theme.colors.green.primary,
        fontWeight: '700',
    },
    meta: {
        color: theme.colors.text.muted,
        fontSize: 12,
        fontWeight: '600',
    },
    description: {
        color: theme.colors.text.secondary,
        fontSize: 13,
        lineHeight: 19,
    },
    ctaButton: {
        marginTop: 4,
        alignSelf: 'flex-start',
        borderRadius: theme.radius.sm,
        backgroundColor: 'rgba(57,255,136,0.12)',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    ctaText: {
        color: theme.colors.green.primary,
        fontSize: 12,
        fontWeight: '700',
    },
});
