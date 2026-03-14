import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { useBriefingStore } from '@/stores/briefingStore';

const C = {
    border: 'rgba(247,244,239,0.14)',
    glass: 'rgba(255,255,255,0.04)',
    title: '#39FF88',
    body: '#DED7CA',
    skeleton: '#1A1A26',
} as const;

function toMotivationalSummary(source?: string | null): string {
    if (!source || source.trim().length === 0) {
        return "You're building momentum today. Keep moving with one focused workout and stay hydrated.";
    }

    const normalized = source.replace(/\s+/g, ' ').replace(/[•\-*]+/g, ' ').trim();
    const lower = normalized.toLowerCase();

    if (lower.includes('recover') || lower.includes('sleep') || lower.includes('rest')) {
        return "You're recovering well today. Your body is ready for light movement — keep it up.";
    }

    if (lower.includes('stress') || lower.includes('fatigue')) {
        return 'Today is a reset day. Keep intensity light, breathe deep, and finish with a short walk.';
    }

    if (lower.includes('steps') || lower.includes('active') || lower.includes('energy')) {
        return 'Your consistency is paying off. Add one quality session today and keep the streak alive.';
    }

    const firstSentence = normalized.split(/[.!?]+/)[0]?.trim();
    if (firstSentence && firstSentence.length >= 18) {
        const clipped = firstSentence.slice(0, 130).trim();
        return clipped.endsWith('.') ? clipped : `${clipped}.`;
    }

    return "You're on track today. Stay consistent with smart movement and strong recovery habits.";
}

export function DailyBriefingCard() {
    const { briefing, loading, error, fetchBriefing } = useBriefingStore();

    useEffect(() => {
        fetchBriefing();
    }, []);

    if (loading) {
        return (
            <View style={styles.card}>
                <Text style={styles.label}>AI Summary</Text>
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, { width: '80%' }]} />
            </View>
        );
    }

    const narrative = toMotivationalSummary(error ?? briefing?.narrative);

    return (
        <View style={styles.card}>
            <BlurView intensity={22} tint="dark" style={styles.blur}>
                <Text style={styles.label}>AI Summary</Text>
                <Text style={styles.narrative} numberOfLines={3}>
                    “{narrative}”
                </Text>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.border,
        overflow: 'hidden',
        backgroundColor: C.glass,
    },
    blur: {
        padding: 16,
        gap: 8,
    },
    label: {
        color: C.title,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    narrative: {
        color: C.body,
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '400',
        fontStyle: 'italic',
    },
    skeletonLine: {
        height: 14,
        borderRadius: 6,
        backgroundColor: C.skeleton,
        width: '100%',
    },
});