import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type NutritionCardProps = {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
};

export function NutritionCard({ title, subtitle, children }: NutritionCardProps) {
    return (
        <View style={styles.card}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={styles.content}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.md,
        padding: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text.primary,
    },
    subtitle: {
        marginTop: 2,
        fontSize: 13,
        color: theme.colors.text.muted,
    },
    content: {
        marginTop: 12,
        gap: 10,
    },
});
