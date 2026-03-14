import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type MealRecommendationCardProps = {
    mealType: string;
    title: string;
    calories: number;
    macroHint: string;
};

export function MealRecommendationCard({
    mealType,
    title,
    calories,
    macroHint,
}: MealRecommendationCardProps) {
    return (
        <View style={styles.card}>
            <Text style={styles.mealType}>{mealType}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.meta}>{calories} kcal • {macroHint}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: 170,
        borderRadius: theme.radius.lg,
        padding: 12,
        backgroundColor: theme.colors.background.secondary,
        gap: 6,
    },
    mealType: {
        color: theme.colors.text.muted,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    title: {
        color: theme.colors.text.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    meta: {
        color: theme.colors.text.secondary,
        fontSize: 12,
        fontWeight: '500',
    },
});
