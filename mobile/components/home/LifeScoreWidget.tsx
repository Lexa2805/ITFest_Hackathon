import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { useLifeScoreStore } from '@/stores/lifeScoreStore';
import { LifeScoreDetailModal } from './LifeScoreDetailModal';

const C = {
    border: 'rgba(247,244,239,0.14)',
    glass: 'rgba(255,255,255,0.06)',
    text: '#F7F4EF',
    body: '#C8C1B6',
    muted: '#8F8779',
    amber: '#F2A65A',
    coral: '#E7836D',
    skeleton: '#1A1A26',
} as const;

export function LifeScoreWidget() {
    const { lifeScore, isLoading } = useLifeScoreStore();
    const [modalVisible, setModalVisible] = useState(false);

    if (isLoading && !lifeScore) {
        return (
            <View style={styles.shell}>
                <Text style={styles.title}>Life Score</Text>
                <View style={styles.skeleton} />
            </View>
        );
    }

    if (!lifeScore) {
        return (
            <TouchableOpacity
                style={styles.shell}
                onPress={() => setModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Generate your first Life Score"
            >
                <Text style={styles.title}>Life Score</Text>
                <Text style={styles.scoreMissing}>--</Text>
                <Text style={styles.summary}>Tap to generate your first personalized score.</Text>
                <LifeScoreDetailModal visible={modalVisible} onClose={() => setModalVisible(false)} />
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={styles.shell}
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Life Score: ${lifeScore.score}. Tap for details.`}
        >
            <BlurView intensity={28} tint="dark" style={styles.blur}>
                <Text style={styles.title}>Life Score</Text>
                <View style={styles.scoreRow}>
                    <Text style={styles.score}>{lifeScore.score}</Text>
                    <View style={styles.scoreMeta}>
                        <Text style={styles.scoreMetaLine}>/100</Text>
                        <Text style={styles.scoreMetaTag}>Today</Text>
                    </View>
                </View>
                <Text style={styles.summary} numberOfLines={2}>
                    {lifeScore.summary}
                </Text>
            </BlurView>
            <LifeScoreDetailModal visible={modalVisible} onClose={() => setModalVisible(false)} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    shell: {
        borderRadius: 22,
        borderWidth: 1,
        borderColor: C.border,
        overflow: 'hidden',
        backgroundColor: C.glass,
        minHeight: 190,
        padding: 16,
        justifyContent: 'space-between',
    },
    blur: {
        flex: 1,
        gap: 8,
    },
    title: {
        color: C.body,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    score: {
        color: C.text,
        fontSize: 88,
        fontWeight: '900',
        lineHeight: 88,
        letterSpacing: -2,
    },
    scoreMeta: {
        paddingBottom: 10,
        gap: 2,
    },
    scoreMetaLine: {
        color: C.muted,
        fontSize: 13,
        fontWeight: '600',
    },
    scoreMetaTag: {
        color: C.coral,
        fontSize: 12,
        fontWeight: '700',
    },
    summary: {
        color: C.body,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    scoreMissing: {
        color: C.amber,
        fontSize: 72,
        fontWeight: '900',
        lineHeight: 76,
        letterSpacing: -2,
    },
    skeleton: {
        marginTop: 12,
        height: 100,
        borderRadius: 12,
        backgroundColor: C.skeleton,
    },
});