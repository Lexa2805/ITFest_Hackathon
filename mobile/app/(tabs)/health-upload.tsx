/**
 * HealthUploadScreen — cyber-wellness Fitness tab with neon accents,
 * bento-style metric cards, and animated entry transitions.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { HealthMetricCard } from '@/components/health/HealthMetricCard';
import { HealthExportUploadResponse, uploadHealthExportZip } from '@/services/healthExportApi';
import { normalizeHealthDataToLast7Days, useHealthStore } from '@/stores/healthStore';
import { theme } from '@/constants/theme';
import { NeonButton } from '@/components/ui/NeonButton';
import { BentoCard } from '@/components/ui/BentoCard';

function formatMetric(value: number, unit: string): string {
    return `${value.toFixed(2)} ${unit}`;
}

function sumValues(values: Array<{ value: number }>): number {
    return values.reduce((total, item) => total + item.value, 0);
}

function averageValues(values: Array<{ value: number }>): number {
    if (values.length === 0) return 0;
    return sumValues(values) / values.length;
}

function toDisplayText(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : fallback;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (Array.isArray(value)) {
        const joined = value
            .map((entry) => toDisplayText(entry, ''))
            .filter((entry) => entry.length > 0)
            .join(' | ');
        return joined.length > 0 ? joined : fallback;
    }

    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;

        if (typeof record.msg === 'string' && record.msg.trim().length > 0) {
            return record.msg;
        }

        try {
            const serialized = JSON.stringify(value);
            return serialized && serialized.length > 0 ? serialized : fallback;
        } catch {
            return fallback;
        }
    }

    return fallback;
}

function extractErrorMessage(error: any, fallback: string): string {
    const apiDetail = error?.response?.data?.detail;
    if (apiDetail !== undefined) {
        return toDisplayText(apiDetail, fallback);
    }

    const apiData = error?.response?.data;
    if (apiData !== undefined) {
        return toDisplayText(apiData, fallback);
    }

    if (error?.message !== undefined) {
        return toDisplayText(error.message, fallback);
    }

    return toDisplayText(error, fallback);
}

type WorkoutRecommendation = {
    title: string;
    why: string;
};

export default function HealthUploadScreen() {
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const storedHealthData = useHealthStore((state) => state.healthData);
    const [result, setResult] = useState<HealthExportUploadResponse | null>(storedHealthData);
    const setHealthData = useHealthStore((state) => state.setHealthData);

    useEffect(() => {
        if (storedHealthData) {
            setResult(storedHealthData);
        }
    }, [storedHealthData]);

    const metricCards = useMemo(() => {
        if (!result) return [];
        const m = result.parsed_metrics;
        return [
            { key: 'heart-rate', title: 'Heart Rate', totalLabel: 'Last 7 Days', totalValue: formatMetric(m.heart_rate.total, m.heart_rate.unit), averageLabel: 'Average', averageValue: formatMetric(m.heart_rate.average, m.heart_rate.unit), samples: m.heart_rate.sample_count },
            { key: 'steps', title: 'Step Count', totalLabel: 'Steps (Last 7 Days)', totalValue: formatMetric(m.step_count.total, m.step_count.unit), averageLabel: 'Average', averageValue: formatMetric(m.step_count.average, m.step_count.unit), samples: m.step_count.sample_count },
            { key: 'sleep', title: 'Sleep Analysis', totalLabel: 'Sleep (Last 7 Days)', totalValue: formatMetric(m.sleep_analysis.total, m.sleep_analysis.unit), averageLabel: 'Average / night', averageValue: formatMetric(m.sleep_analysis.average, m.sleep_analysis.unit), samples: m.sleep_analysis.sample_count },
            { key: 'calories', title: 'Calories Burned', totalLabel: 'Last 7 Days', totalValue: formatMetric(m.active_energy_burned.total, m.active_energy_burned.unit), averageLabel: 'Average', averageValue: formatMetric(m.active_energy_burned.average, m.active_energy_burned.unit), samples: m.active_energy_burned.sample_count },
            { key: 'hrv', title: 'HRV (SDNN)', totalLabel: 'Last 7 Days', totalValue: formatMetric(m.hrv_sdnn.total, m.hrv_sdnn.unit), averageLabel: 'Average', averageValue: formatMetric(m.hrv_sdnn.average, m.hrv_sdnn.unit), samples: m.hrv_sdnn.sample_count },
        ];
    }, [result]);

    const heroWorkout = useMemo(() => {
        if (!result) {
            return {
                title: 'Upload health export to generate today\'s workout',
                subtitle: 'Your recommendation adapts from heart rate, HRV, steps, and sleep quality.',
            };
        }
        const score = result.physical_state.score;
        if (score >= 80) return { title: 'Tempo Intervals + Strength Finish', subtitle: 'High readiness detected — use today for quality intensity and structured effort.' };
        if (score >= 60) return { title: 'Zone 2 Endurance Session', subtitle: 'Moderate readiness — prioritize aerobic conditioning and smooth pacing.' };
        return { title: 'Mobility Flow + Recovery Walk', subtitle: 'Recovery signal detected — keep effort low and focus on restoration.' };
    }, [result]);

    const recommendations = useMemo<WorkoutRecommendation[]>(() => {
        if (!result) return [{ title: 'Export-first analysis', why: 'Import your Apple Health ZIP to unlock personalized fitness recommendations.' }];
        const score = result.physical_state.score;
        if (score >= 80) return [
            { title: 'Threshold Intervals', why: 'High readiness supports quality work near lactate threshold.' },
            { title: 'Heavy Lower Body Strength', why: 'Neuromuscular strain tolerance is elevated today.' },
        ];
        if (score >= 60) return [
            { title: 'Steady Cardio (30–40 min)', why: 'Build endurance with controlled intensity and consistent breathing.' },
            { title: 'Core Stability Circuit', why: 'Supports posture and movement quality without excess fatigue.' },
        ];
        return [
            { title: 'Mobility + Breath Session', why: 'Lower readiness benefits from low-impact mobility and parasympathetic recovery.' },
            { title: 'Light Walking Volume', why: 'Accumulating easy steps aids circulation and recovery adaptation.' },
        ];
    }, [result]);

    const metricPills = useMemo(() => {
        if (!result) return [{ label: 'HR', value: '--' }, { label: 'HRV', value: '--' }, { label: 'Steps', value: '--' }];
        return [
            { label: 'HR', value: `${Math.round(result.parsed_metrics.heart_rate.average)} bpm` },
            { label: 'HRV', value: `${Math.round(result.parsed_metrics.hrv_sdnn.average)} ms` },
            { label: 'Steps', value: `${Math.round(result.parsed_metrics.step_count.average).toLocaleString()}` },
        ];
    }, [result]);

    const weeklySummary = useMemo(() => {
        if (!result) return null;

        const weeklySteps = result.raw_series?.steps ?? [];
        const weeklyCalories = result.raw_series?.active_energy ?? [];
        const weeklySleep = result.raw_series?.sleep_hours ?? [];

        if (weeklySteps.length === 0 && weeklyCalories.length === 0 && weeklySleep.length === 0) {
            return null;
        }

        const totalWeeklySteps = sumValues(weeklySteps);
        const avgDailyCalories = averageValues(weeklyCalories);
        const avgSleepHours = averageValues(weeklySleep);
        const trackedDays = Math.max(weeklySteps.length, weeklyCalories.length, weeklySleep.length);

        return {
            totalWeeklySteps,
            avgDailyCalories,
            avgSleepHours,
            trackedDays,
        };
    }, [result]);

    async function handlePickAndUpload() {
        setErrorMessage(null);
        const picked = await DocumentPicker.getDocumentAsync({
            type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
            multiple: false,
            copyToCacheDirectory: true,
        });
        if (picked.canceled) return;
        const selectedFile = picked.assets[0];
        if (!selectedFile?.uri) {
            setErrorMessage('Could not read the selected file. Please try another ZIP export.');
            return;
        }

        const resolvedName = selectedFile.name?.toLowerCase().endsWith('.zip')
            ? selectedFile.name
            : `${selectedFile.name ?? 'health-export'}.zip`;
        const resolvedType = selectedFile.mimeType || 'application/zip';

        try {
            setProcessing(true);
            const uploadResponse = await uploadHealthExportZip(selectedFile.uri, resolvedName, resolvedType);
            const filteredResponse = normalizeHealthDataToLast7Days(uploadResponse) ?? uploadResponse;
            setResult(filteredResponse);
            setHealthData(filteredResponse);
        } catch (error: any) {
            const statusCode = error?.response?.status;
            if (statusCode === 400 || statusCode === 422) {
                setErrorMessage(extractErrorMessage(error, 'Upload failed. Please confirm this ZIP contains export.xml from Apple Health.'));
            } else {
                setErrorMessage(extractErrorMessage(error, 'Upload failed. Please verify this is a valid Apple Health export ZIP.'));
            }
        } finally {
            setProcessing(false);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* ── Header ── */}
                <Animated.View entering={FadeInUp.duration(500)}>
                    <Text style={styles.title}>Fitness</Text>
                    <Text style={styles.subtitle}>Workout recommendations powered by your health export.</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.duration(500).delay(100)}>
                    <NeonButton label="Upload Apple Health Export" onPress={handlePickAndUpload} disabled={processing} loading={processing} />
                </Animated.View>

                {weeklySummary ? (
                    <Animated.View entering={FadeInDown.duration(500).delay(150)}>
                        <BentoCard highlighted span={2} style={styles.weeklySummaryCard}>
                            <Text style={styles.weeklySummaryEyebrow}>Last 7 days</Text>
                            <Text style={styles.weeklySummaryTitle}>Weekly sync summary</Text>
                            <View style={styles.weeklySummaryGrid}>
                                <View style={styles.weeklySummaryItem}>
                                    <Text style={styles.weeklySummaryLabel}>Total Steps</Text>
                                    <Text style={styles.weeklySummaryValue}>{Math.round(weeklySummary.totalWeeklySteps).toLocaleString()}</Text>
                                </View>
                                <View style={styles.weeklySummaryItem}>
                                    <Text style={styles.weeklySummaryLabel}>Avg Calories / day</Text>
                                    <Text style={styles.weeklySummaryValue}>{Math.round(weeklySummary.avgDailyCalories).toLocaleString()} kcal</Text>
                                </View>
                                <View style={styles.weeklySummaryItem}>
                                    <Text style={styles.weeklySummaryLabel}>Avg Sleep / night</Text>
                                    <Text style={styles.weeklySummaryValue}>{weeklySummary.avgSleepHours.toFixed(1)} h</Text>
                                </View>
                                <View style={styles.weeklySummaryItem}>
                                    <Text style={styles.weeklySummaryLabel}>Tracked Days</Text>
                                    <Text style={styles.weeklySummaryValue}>{weeklySummary.trackedDays}/7</Text>
                                </View>
                            </View>
                        </BentoCard>
                    </Animated.View>
                ) : null}

                {result && !weeklySummary ? (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoText}>Weekly summary is available after uploading a recent export with timestamped entries.</Text>
                    </View>
                ) : null}

                {processing ? (
                    <View style={styles.loadingCard}>
                        <ActivityIndicator color={theme.colors.green.primary} size="small" />
                        <Text style={styles.loadingText}>Processing export.xml and calculating your readiness...</Text>
                    </View>
                ) : null}

                {errorMessage ? (
                    <View style={styles.errorCard}>
                        <Text style={styles.errorText}>{toDisplayText(errorMessage, 'Upload failed.')}</Text>
                    </View>
                ) : null}

                {/* ── Hero workout card ── */}
                <Animated.View entering={FadeInDown.duration(600).delay(200)}>
                    <View style={styles.heroWrap}>
                        <LinearGradient
                            colors={['rgba(57,255,136,0.06)', 'rgba(57,255,136,0.01)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGradient}
                        >
                            <Text style={styles.heroEyebrow}>Today's recommendation</Text>
                            <Text style={styles.heroTitle}>{heroWorkout.title}</Text>
                            <Text style={styles.heroSubtitle}>{heroWorkout.subtitle}</Text>
                        </LinearGradient>
                    </View>
                </Animated.View>

                {/* ── Metric pills ── */}
                <Animated.View entering={FadeInDown.duration(500).delay(300)}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                        {metricPills.map((pill) => (
                            <View key={pill.label} style={styles.metricPill}>
                                <Text style={styles.metricPillLabel}>{pill.label}</Text>
                                <Text style={styles.metricPillValue}>{pill.value}</Text>
                            </View>
                        ))}
                        {result ? (
                            <View style={[styles.metricPill, styles.metricPillHighlight]}>
                                <Text style={styles.metricPillLabel}>Score</Text>
                                <Text style={[styles.metricPillValue, { color: theme.colors.green.primary }]}>{result.physical_state.score}</Text>
                            </View>
                        ) : null}
                    </ScrollView>
                </Animated.View>

                {/* ── Recommendations ── */}
                <Animated.View entering={FadeInDown.duration(500).delay(400)}>
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
                </Animated.View>

                {/* ── Detailed metric cards ── */}
                {result ? (
                    <Animated.View entering={FadeInDown.duration(500).delay(500)}>
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
                    </Animated.View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background.main,
    },
    content: {
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 100,
        gap: 16,
    },
    title: {
        fontSize: 34,
        fontWeight: '800',
        color: theme.colors.text.primary,
        letterSpacing: 0.3,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.text.muted,
        lineHeight: 20,
    },
    loadingCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        color: theme.colors.text.secondary,
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    errorCard: {
        backgroundColor: 'rgba(255,82,82,0.08)',
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,82,82,0.25)',
        padding: 14,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    infoCard: {
        backgroundColor: 'rgba(57,255,136,0.08)',
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(57,255,136,0.25)',
        padding: 12,
    },
    infoText: {
        color: theme.colors.text.secondary,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '600',
    },
    heroWrap: {
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.background.secondary,
    },
    heroGradient: {
        padding: 20,
        gap: 8,
    },
    heroEyebrow: {
        color: theme.colors.green.accent,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    heroTitle: {
        color: theme.colors.text.primary,
        fontSize: 28,
        fontWeight: '800',
        lineHeight: 34,
        letterSpacing: 0.2,
    },
    heroSubtitle: {
        color: theme.colors.text.secondary,
        fontSize: 14,
        lineHeight: 20,
    },
    pillsRow: {
        paddingVertical: 2,
        gap: 10,
    },
    metricPill: {
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.background.secondary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 2,
    },
    metricPillHighlight: {
        backgroundColor: 'rgba(57,255,136,0.08)',
    },
    metricPillLabel: {
        color: theme.colors.text.muted,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    metricPillValue: {
        color: theme.colors.text.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    recommendationList: {
        gap: 10,
    },
    recommendationCard: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: 14,
        flexDirection: 'row',
        gap: 12,
    },
    recommendationAccent: {
        width: 3,
        borderRadius: 2,
        backgroundColor: theme.colors.green.primary,
    },
    recommendationContent: {
        flex: 1,
        gap: 4,
    },
    recommendationTitle: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: '800',
    },
    recommendationWhy: {
        color: theme.colors.text.muted,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '500',
    },
    cardsColumn: {
        gap: 10,
    },
    weeklySummaryCard: {
        width: '100%',
        minHeight: 0,
        gap: 12,
    },
    weeklySummaryEyebrow: {
        color: theme.colors.green.accent,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    weeklySummaryTitle: {
        color: theme.colors.text.primary,
        fontSize: 20,
        fontWeight: '800',
    },
    weeklySummaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    weeklySummaryItem: {
        backgroundColor: theme.colors.background.main,
        borderRadius: theme.radius.md,
        paddingVertical: 10,
        paddingHorizontal: 12,
        width: '48%',
        gap: 4,
    },
    weeklySummaryLabel: {
        color: theme.colors.text.muted,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    weeklySummaryValue: {
        color: theme.colors.green.primary,
        fontSize: 16,
        fontWeight: '800',
    },
});
