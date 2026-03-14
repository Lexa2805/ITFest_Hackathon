import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { HealthMetricCard } from '@/components/health/HealthMetricCard';
import { HealthExportUploadResponse, uploadHealthExportZip } from '@/services/healthExportApi';
import { useHealthStore } from '@/stores/healthStore';

const C = {
    bg: '#0D0D14',
    text: '#F7F4EF',
    body: '#C8C1B6',
    muted: '#8F8779',
    amber: '#F2A65A',
    coral: '#E7836D',
    border: 'rgba(247,244,239,0.14)',
    glass: 'rgba(255,255,255,0.05)',
    danger: '#F08A7C',
} as const;

function formatMetric(value: number, unit: string): string {
    return `${value.toFixed(2)} ${unit}`;
}

type WorkoutRecommendation = {
    title: string;
    why: string;
};

export default function HealthUploadScreen() {
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [result, setResult] = useState<HealthExportUploadResponse | null>(null);
    const setHealthData = useHealthStore((state) => state.setHealthData);

    const metricCards = useMemo(() => {
        if (!result) {
            return [];
        }

        const m = result.parsed_metrics;
        return [
            {
                key: 'heart-rate',
                title: 'Heart Rate',
                totalLabel: 'Total',
                totalValue: formatMetric(m.heart_rate.total, m.heart_rate.unit),
                averageLabel: 'Average',
                averageValue: formatMetric(m.heart_rate.average, m.heart_rate.unit),
                samples: m.heart_rate.sample_count,
            },
            {
                key: 'steps',
                title: 'Step Count',
                totalLabel: 'Total Steps',
                totalValue: formatMetric(m.step_count.total, m.step_count.unit),
                averageLabel: 'Average',
                averageValue: formatMetric(m.step_count.average, m.step_count.unit),
                samples: m.step_count.sample_count,
            },
            {
                key: 'sleep',
                title: 'Sleep Analysis',
                totalLabel: 'Total Sleep',
                totalValue: formatMetric(m.sleep_analysis.total, m.sleep_analysis.unit),
                averageLabel: 'Average / night',
                averageValue: formatMetric(m.sleep_analysis.average, m.sleep_analysis.unit),
                samples: m.sleep_analysis.sample_count,
            },
            {
                key: 'calories',
                title: 'Calories Burned',
                totalLabel: 'Total',
                totalValue: formatMetric(m.active_energy_burned.total, m.active_energy_burned.unit),
                averageLabel: 'Average',
                averageValue: formatMetric(m.active_energy_burned.average, m.active_energy_burned.unit),
                samples: m.active_energy_burned.sample_count,
            },
            {
                key: 'hrv',
                title: 'HRV (SDNN)',
                totalLabel: 'Total',
                totalValue: formatMetric(m.hrv_sdnn.total, m.hrv_sdnn.unit),
                averageLabel: 'Average',
                averageValue: formatMetric(m.hrv_sdnn.average, m.hrv_sdnn.unit),
                samples: m.hrv_sdnn.sample_count,
            },
        ];
    }, [result]);

    const heroWorkout = useMemo(() => {
        if (!result) {
            return {
                title: 'Upload health export to generate today’s workout',
                subtitle: 'Your recommendation adapts from heart rate, HRV, steps, and sleep quality.',
            };
        }

        const score = result.physical_state.score;
        if (score >= 80) {
            return {
                title: 'Tempo Intervals + Strength Finish',
                subtitle: 'High readiness detected — use today for quality intensity and structured effort.',
            };
        }

        if (score >= 60) {
            return {
                title: 'Zone 2 Endurance Session',
                subtitle: 'Moderate readiness — prioritize aerobic conditioning and smooth pacing.',
            };
        }

        return {
            title: 'Mobility Flow + Recovery Walk',
            subtitle: 'Recovery signal detected — keep effort low and focus on restoration.',
        };
    }, [result]);

    const recommendations = useMemo<WorkoutRecommendation[]>(() => {
        if (!result) {
            return [
                {
                    title: 'Export-first analysis',
                    why: 'Import your Apple Health ZIP to unlock personalized fitness recommendations.',
                },
            ];
        }

        const score = result.physical_state.score;
        if (score >= 80) {
            return [
                {
                    title: 'Threshold Intervals',
                    why: 'High readiness supports quality work near lactate threshold.',
                },
                {
                    title: 'Heavy Lower Body Strength',
                    why: 'Neuromuscular strain tolerance is elevated today.',
                },
            ];
        }

        if (score >= 60) {
            return [
                {
                    title: 'Steady Cardio (30–40 min)',
                    why: 'Build endurance with controlled intensity and consistent breathing.',
                },
                {
                    title: 'Core Stability Circuit',
                    why: 'Supports posture and movement quality without excess fatigue.',
                },
            ];
        }

        return [
            {
                title: 'Mobility + Breath Session',
                why: 'Lower readiness benefits from low-impact mobility and parasympathetic recovery.',
            },
            {
                title: 'Light Walking Volume',
                why: 'Accumulating easy steps aids circulation and recovery adaptation.',
            },
        ];
    }, [result]);

    const metricPills = useMemo(() => {
        if (!result) {
            return [
                { label: 'HR', value: '--' },
                { label: 'HRV', value: '--' },
                { label: 'Steps', value: '--' },
            ];
        }

        return [
            { label: 'HR', value: `${Math.round(result.parsed_metrics.heart_rate.average)} bpm` },
            { label: 'HRV', value: `${Math.round(result.parsed_metrics.hrv_sdnn.average)} ms` },
            { label: 'Steps', value: `${Math.round(result.parsed_metrics.step_count.average).toLocaleString()}` },
        ];
    }, [result]);

    async function handlePickAndUpload() {
        setErrorMessage(null);

        const picked = await DocumentPicker.getDocumentAsync({
            type: 'application/zip',
            multiple: false,
            copyToCacheDirectory: true,
        });

        if (picked.canceled) {
            return;
        }

        const selectedFile = picked.assets[0];
        if (!selectedFile?.uri || !selectedFile?.name) {
            setErrorMessage('Could not read the selected file. Please try another ZIP export.');
            return;
        }

        try {
            setProcessing(true);
            const uploadResponse = await uploadHealthExportZip(selectedFile.uri, selectedFile.name);
            setResult(uploadResponse);
            setHealthData(uploadResponse);
        } catch (error: any) {
            const serverMessage = error?.response?.data?.detail;
            setErrorMessage(serverMessage || 'Upload failed. Please verify this is a valid Apple Health export ZIP.');
        } finally {
            setProcessing(false);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.headerBlock}>
                    <Text style={styles.title}>Fitness</Text>
                    <Text style={styles.subtitle}>Workout recommendations powered by your health export.</Text>
                </View>

                <Pressable style={styles.uploadButton} onPress={handlePickAndUpload} disabled={processing}>
                    <Text style={styles.uploadButtonText}>Upload Apple Health Export</Text>
                </Pressable>

                {processing ? (
                    <View style={styles.loadingCard}>
                        <ActivityIndicator color={C.amber} size="small" />
                        <Text style={styles.loadingText}>Processing export.xml and calculating your readiness...</Text>
                    </View>
                ) : null}

                {errorMessage ? (
                    <View style={styles.errorCard}>
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : null}

                <View style={styles.heroWrap}>
                    <BlurView intensity={26} tint="dark" style={styles.heroCard}>
                        <Text style={styles.heroEyebrow}>Today’s recommendation</Text>
                        <Text style={styles.heroTitle}>{heroWorkout.title}</Text>
                        <Text style={styles.heroSubtitle}>{heroWorkout.subtitle}</Text>
                    </BlurView>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                    {metricPills.map((pill) => (
                        <View key={pill.label} style={styles.metricPill}>
                            <Text style={styles.metricPillLabel}>{pill.label}</Text>
                            <Text style={styles.metricPillValue}>{pill.value}</Text>
                        </View>
                    ))}
                    {result ? (
                        <View style={styles.metricPill}>
                            <Text style={styles.metricPillLabel}>Score</Text>
                            <Text style={styles.metricPillValue}>{result.physical_state.score}</Text>
                        </View>
                    ) : null}
                </ScrollView>

                <View style={styles.recommendationList}>
                    {recommendations.map((item) => (
                        <View key={item.title} style={styles.recommendationCard}>
                            <View style={styles.recommendationAccent} />
                            <View style={styles.recommendationContent}>
                                <Text style={styles.recommendationTitle}>{item.title}</Text>
                                <Text style={styles.recommendationWhy}>{item.why}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {result ? (
                    <View style={styles.cardsColumn}>
                        {metricCards.map((metric) => (
                            <HealthMetricCard
                                key={metric.key}
                                title={metric.title}
                                totalLabel={metric.totalLabel}
                                totalValue={metric.totalValue}
                                averageLabel={metric.averageLabel}
                                averageValue={metric.averageValue}
                                samples={metric.samples}
                            />
                        ))}
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: C.bg,
    },
    content: {
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 28,
        gap: 12,
    },
    headerBlock: {
        gap: 2,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: C.text,
    },
    subtitle: {
        fontSize: 14,
        color: C.body,
        lineHeight: 20,
    },
    uploadButton: {
        backgroundColor: C.amber,
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
    },
    uploadButtonText: {
        color: '#2E1B06',
        fontSize: 14,
        fontWeight: '800',
    },
    loadingCard: {
        backgroundColor: C.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        color: C.body,
        fontSize: 13,
        fontWeight: '500',
    },
    errorCard: {
        backgroundColor: 'rgba(240,138,124,0.12)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(240,138,124,0.38)',
        padding: 14,
    },
    errorText: {
        color: C.danger,
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    heroWrap: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.border,
        overflow: 'hidden',
        backgroundColor: C.glass,
    },
    heroCard: {
        padding: 16,
        gap: 8,
    },
    heroEyebrow: {
        color: C.coral,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    heroTitle: {
        color: C.text,
        fontSize: 30,
        fontWeight: '800',
        lineHeight: 34,
        letterSpacing: 0.2,
    },
    heroSubtitle: {
        color: C.body,
        fontSize: 14,
        lineHeight: 20,
    },
    pillsRow: {
        paddingVertical: 2,
        gap: 10,
    },
    metricPill: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.glass,
        paddingVertical: 8,
        paddingHorizontal: 14,
        gap: 2,
    },
    metricPillLabel: {
        color: C.muted,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    metricPillValue: {
        color: C.text,
        fontSize: 14,
        fontWeight: '700',
    },
    recommendationList: {
        gap: 10,
    },
    recommendationCard: {
        backgroundColor: '#12111A',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        padding: 12,
        flexDirection: 'row',
        gap: 10,
    },
    recommendationAccent: {
        width: 3,
        borderRadius: 2,
        backgroundColor: C.amber,
    },
    recommendationContent: {
        flex: 1,
        gap: 4,
    },
    recommendationTitle: {
        color: C.text,
        fontSize: 16,
        fontWeight: '800',
    },
    recommendationWhy: {
        color: C.muted,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '500',
    },
    cardsColumn: {
        gap: 10,
        marginTop: 4,
    },
});