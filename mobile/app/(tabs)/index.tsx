import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { useHealthStore } from '@/stores/healthStore';
import { useAuthStore } from '@/stores/authStore';
import { DailyBriefingCard } from '../../components/home/DailyBriefingCard';
import { LifeScoreWidget } from '../../components/home/LifeScoreWidget';
import { TrendSparkline } from '@/components/home/TrendSparkline';
import { ExpiryAlertBanner } from '@/components/home/ExpiryAlertBanner';
import { getTrendData, type TrendResponse } from '@/services/trendApi';
import { getStreaks, type StreakResponse } from '@/services/streakApi';
import { getExpiryAlerts, type ExpiryAlertItem } from '@/services/expiryApi';
import { useLifeScoreStore } from '@/stores/lifeScoreStore';

type HealthMetric = {
    label: string;
    value: string;
    trend: string;
};

const C = {
    bg: '#0D0D14',
    bgSoft: '#11111A',
    text: '#F7F4EF',
    body: '#C8C1B6',
    muted: '#8F8779',
    amber: '#F2A65A',
    coral: '#E7836D',
    goldSoft: 'rgba(242,166,90,0.14)',
    glassBorder: 'rgba(247,244,239,0.14)',
    glassBg: 'rgba(255,255,255,0.05)',
} as const;

const mockHealthMetrics: HealthMetric[] = [
    { label: 'Sleep', value: 'No data', trend: 'Upload health data' },
    { label: 'Heart Rate', value: 'No data', trend: 'Upload health data' },
    { label: 'Steps', value: 'No data', trend: 'Upload health data' },
    { label: 'Calories', value: 'No data', trend: 'Upload health data' },
];

function GlassCard({ children, highlighted = false }: { children: React.ReactNode; highlighted?: boolean }) {
    return (
        <View style={[styles.glassWrap, highlighted && styles.glassWrapActive]}>
            <BlurView intensity={26} tint="dark" style={styles.glassBlur}>
                <View style={[styles.glassInner, highlighted && styles.glassInnerActive]}>{children}</View>
            </BlurView>
        </View>
    );
}

export default function HomeScreen() {
    const healthData = useHealthStore((state) => state.healthData);
    const loadHealthData = useHealthStore((state) => state.loadHealthData);
    const isHealthInitialized = useHealthStore((state) => state.isInitialized);
    const user = useAuthStore((state) => state.user);
    const fetchLifeScore = useLifeScoreStore((state) => state.fetchLifeScore);

    const [trendSleep, setTrendSleep] = useState<TrendResponse | null>(null);
    const [trendSteps, setTrendSteps] = useState<TrendResponse | null>(null);
    const [trendCalories, setTrendCalories] = useState<TrendResponse | null>(null);
    const [streaks, setStreaks] = useState<StreakResponse | null>(null);
    const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlertItem[]>([]);

    useEffect(() => {
        if (!isHealthInitialized) {
            loadHealthData();
        }

        getTrendData('sleep_hours', 7).then(setTrendSleep).catch(() => { });
        getTrendData('steps', 7).then(setTrendSteps).catch(() => { });
        getTrendData('calories', 7).then(setTrendCalories).catch(() => { });
        getStreaks().then(setStreaks).catch(() => { });
        getExpiryAlerts().then(setExpiryAlerts).catch(() => { });
        fetchLifeScore();
    }, []);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }, []);

    const userName = useMemo(() => {
        if (user?.email) {
            const emailName = user.email.split('@')[0];
            return emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
        return 'there';
    }, [user]);

    const healthMetrics: HealthMetric[] = useMemo(() => {
        if (!healthData) {
            return mockHealthMetrics;
        }

        const m = healthData.parsed_metrics;

        const formatHours = (hours: number): string => {
            const h = Math.floor(hours);
            const mins = Math.round((hours - h) * 60);
            return `${h}h ${mins}m`;
        };

        const formatNumber = (num: number): string => Math.round(num).toLocaleString();

        return [
            {
                label: 'Sleep',
                value: formatHours(m.sleep_analysis.average),
                trend: `${m.sleep_analysis.sample_count} nights`,
            },
            {
                label: 'Heart Rate',
                value: `${Math.round(m.heart_rate.average)} bpm`,
                trend: 'Average',
            },
            {
                label: 'Steps',
                value: formatNumber(m.step_count.average),
                trend: 'Daily avg',
            },
            {
                label: 'Calories',
                value: formatNumber(m.active_energy_burned.average),
                trend: 'Daily avg',
            },
        ];
    }, [healthData]);

    const primaryStreakDays = useMemo(() => {
        if (!streaks) return 0;
        return Math.max(
            streaks.checkin.current_streak,
            streaks.meal_logged.current_streak,
            streaks.calorie_goal.current_streak,
        );
    }, [streaks]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.headerBlock}>
                    <Text style={styles.greeting}>{greeting}</Text>
                    <Text style={styles.userName}>{userName}</Text>
                    <Text style={styles.caption}>Today has one goal: consistent, quality movement.</Text>
                </View>

                <View style={styles.heroWrap}>
                    <LifeScoreWidget />
                </View>

                {streaks ? (
                    <View style={styles.streakBar}>
                        <View style={styles.streakMainRow}>
                            <Text style={styles.streakEmoji}>🔥</Text>
                            <Text style={styles.streakValue}>{primaryStreakDays} day streak</Text>
                        </View>
                        <View style={styles.streakMiniRow}>
                            <Text style={styles.streakMiniText}>Check-in {streaks.checkin.current_streak}</Text>
                            <Text style={styles.streakMiniText}>Nutrition {streaks.meal_logged.current_streak}</Text>
                            <Text style={styles.streakMiniText}>Goal {streaks.calorie_goal.current_streak}</Text>
                        </View>
                    </View>
                ) : null}

                <DailyBriefingCard />

                {expiryAlerts.length > 0 ? <ExpiryAlertBanner items={expiryAlerts} /> : null}

                <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>Activity</Text>
                    <Text style={styles.sectionHint}>Live overview</Text>
                </View>

                <View style={styles.metricsGrid}>
                    {healthMetrics.map((metric, index) => (
                        <GlassCard key={metric.label} highlighted={index === 0}>
                            <Text style={styles.metricLabel}>{metric.label}</Text>
                            <Text style={styles.metricValue}>{metric.value}</Text>
                            <Text style={styles.metricTrend}>{metric.trend}</Text>
                        </GlassCard>
                    ))}
                </View>

                <View style={styles.trendCard}>
                    <Text style={styles.sectionTitle}>7-day movement pulse</Text>
                    <View style={styles.trendRow}>
                        <TrendSparkline dataPoints={trendSleep?.data_points ?? []} label="Sleep" />
                        <TrendSparkline dataPoints={trendSteps?.data_points ?? []} label="Steps" />
                        <TrendSparkline dataPoints={trendCalories?.data_points ?? []} label="Calories" />
                    </View>
                </View>
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
        gap: 14,
    },
    headerBlock: {
        gap: 2,
    },
    greeting: {
        fontSize: 16,
        color: C.muted,
        fontWeight: '500',
    },
    userName: {
        fontSize: 34,
        color: C.text,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    caption: {
        color: C.body,
        fontSize: 14,
        marginTop: 2,
    },
    heroWrap: {
        marginTop: 2,
    },
    streakBar: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(242,166,90,0.5)',
        backgroundColor: C.goldSoft,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 8,
    },
    streakMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    streakEmoji: {
        fontSize: 20,
    },
    streakValue: {
        color: C.amber,
        fontSize: 24,
        fontWeight: '800',
    },
    streakMiniRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    streakMiniText: {
        color: C.body,
        fontSize: 12,
        fontWeight: '600',
    },
    sectionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 2,
    },
    sectionTitle: {
        color: C.text,
        fontSize: 18,
        fontWeight: '700',
    },
    sectionHint: {
        color: C.muted,
        fontSize: 12,
        fontWeight: '600',
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    glassWrap: {
        width: '48.5%',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: C.glassBorder,
    },
    glassWrapActive: {
        shadowColor: C.amber,
        shadowOpacity: 0.28,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 16,
        elevation: 6,
    },
    glassBlur: {
        width: '100%',
    },
    glassInner: {
        backgroundColor: C.glassBg,
        padding: 14,
        gap: 5,
        minHeight: 104,
    },
    glassInnerActive: {
        borderLeftWidth: 2,
        borderLeftColor: C.coral,
    },
    metricLabel: {
        color: C.muted,
        fontSize: 12,
        fontWeight: '600',
    },
    metricValue: {
        color: C.text,
        fontSize: 24,
        fontWeight: '800',
    },
    metricTrend: {
        color: C.body,
        fontSize: 12,
        fontWeight: '500',
    },
    trendCard: {
        backgroundColor: C.bgSoft,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(247,244,239,0.08)',
        padding: 14,
        gap: 10,
    },
    trendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
});