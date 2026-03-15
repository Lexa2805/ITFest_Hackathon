/**
 * HomeScreen — bento-box dashboard with cyber-wellness aesthetic.
 * Large typography, neon glow accents, no borders — spacing-driven layout.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useHealthStore } from '@/stores/healthStore';
import { useLifeScoreStore } from '@/stores/lifeScoreStore';
import { useProfileContext } from '@/contexts/ProfileContext';
import { DailyBriefingCard } from '@/components/home/DailyBriefingCard';
import { LifeScoreWidget } from '@/components/home/LifeScoreWidget';
import { TrendSparkline } from '@/components/home/TrendSparkline';
import { ExpiryAlertBanner } from '@/components/home/ExpiryAlertBanner';
import { BentoCard } from '@/components/ui/BentoCard';
import { getTrendData, type TrendResponse } from '@/services/trendApi';
import { getStreaks, type StreakResponse } from '@/services/streakApi';
import { getExpiryAlerts, type ExpiryAlertItem } from '@/services/expiryApi';
import { theme } from '@/constants/theme';

type HealthMetric = {
  label: string;
  value: string;
  unit: string;
  icon: string;
};

const mockMetrics: HealthMetric[] = [
  { label: 'Sleep', value: '--', unit: '', icon: '🌙' },
  { label: 'Heart Rate', value: '--', unit: 'bpm', icon: '💚' },
  { label: 'Steps', value: '--', unit: '', icon: '👟' },
  { label: 'HRV', value: '--', unit: 'ms', icon: '📈' },
];

export default function HomeScreen() {
  const healthData = useHealthStore((s) => s.healthData);
  const loadHealthData = useHealthStore((s) => s.loadHealthData);
  const isHealthInitialized = useHealthStore((s) => s.isInitialized);
  const fetchLifeScore = useLifeScoreStore((s) => s.fetchLifeScore);
  const { profile } = useProfileContext();

  const [trendSleep, setTrendSleep] = useState<TrendResponse | null>(null);
  const [trendSteps, setTrendSteps] = useState<TrendResponse | null>(null);
  const [trendCalories, setTrendCalories] = useState<TrendResponse | null>(null);
  const [trendHeartRate, setTrendHeartRate] = useState<TrendResponse | null>(null);
  const [streaks, setStreaks] = useState<StreakResponse | null>(null);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlertItem[]>([]);

  useEffect(() => {
    if (!isHealthInitialized) loadHealthData();
    getTrendData('sleep_hours', 7).then(setTrendSleep).catch(() => { });
    getTrendData('steps', 7).then(setTrendSteps).catch(() => { });
    getTrendData('calories', 7).then(setTrendCalories).catch(() => { });
    getTrendData('heart_rate', 7).then(setTrendHeartRate).catch(() => { });
    getStreaks().then(setStreaks).catch(() => { });
    getExpiryAlerts().then(setExpiryAlerts).catch(() => { });
    fetchLifeScore();
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const userName = useMemo(() => {
    if (profile?.name && profile.name.trim().length > 0) return profile.name.trim();
    return 'there';
  }, [profile?.name]);

  const healthMetrics: HealthMetric[] = useMemo(() => {
    if (!healthData) return mockMetrics;
    const m = healthData.parsed_metrics;
    const heartRate7dAvg =
      trendHeartRate && trendHeartRate.data_points.length > 0
        ? trendHeartRate.data_points.reduce((sum, point) => sum + point.value, 0) /
        trendHeartRate.data_points.length
        : null;
    const fmtH = (hrs: number) => {
      const h = Math.floor(hrs);
      const mins = Math.round((hrs - h) * 60);
      return `${h}h ${mins}m`;
    };
    const fmtN = (n: number) => Math.round(n).toLocaleString();
    return [
      { label: 'Sleep', value: fmtH(m.sleep_analysis.average), unit: '', icon: '🌙' },
      {
        label: 'Heart Rate',
        value: `${Math.round(heartRate7dAvg ?? m.heart_rate.average)}`,
        unit: 'bpm',
        icon: '💚',
      },
      { label: 'Steps', value: fmtN(m.step_count.average), unit: '', icon: '👟' },
      { label: 'HRV', value: `${Math.round(m.hrv_sdnn.average)}`, unit: 'ms', icon: '📈' },
    ];
  }, [healthData, trendHeartRate]);

  const primaryStreak = useMemo(() => {
    if (!streaks) return 0;
    return Math.max(
      streaks.checkin.current_streak,
      streaks.meal_logged.current_streak,
      streaks.calorie_goal.current_streak,
    );
  }, [streaks]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ── */}
        <Animated.View entering={FadeInUp.duration(500)} style={styles.greetingBlock}>
          <Text style={styles.greetingLabel}>{greeting}</Text>
          <Text style={styles.greetingName}>{userName}</Text>
        </Animated.View>

        {/* ── Life Score Hero ── */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <LifeScoreWidget />
        </Animated.View>

        {/* ── Streak pill ── */}
        {streaks && (
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.streakPill}>
            <LinearGradient
              colors={['rgba(57,255,136,0.12)', 'rgba(57,255,136,0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.streakGradient}
            >
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.streakCount}>{primaryStreak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
              <View style={styles.streakDivider} />
              <Text style={styles.streakMini}>Check-in {streaks.checkin.current_streak}</Text>
              <Text style={styles.streakMini}>·</Text>
              <Text style={styles.streakMini}>Meals {streaks.meal_logged.current_streak}</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* ── Daily Briefing ── */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <DailyBriefingCard />
        </Animated.View>

        {/* ── Expiry Alerts ── */}
        {expiryAlerts.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(350)}>
            <ExpiryAlertBanner items={expiryAlerts} />
          </Animated.View>
        )}

        {/* ── Activity Bento Grid ── */}
        <Animated.View entering={FadeInDown.duration(500).delay(400)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <Text style={styles.sectionHint}>Live overview</Text>
          </View>

          <View style={styles.bentoGrid}>
            {healthMetrics.map((metric, i) => (
              <BentoCard key={metric.label} highlighted={i === 0}>
                <Text style={styles.metricIcon}>{metric.icon}</Text>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  {metric.unit ? (
                    <Text style={styles.metricUnit}>{metric.unit}</Text>
                  ) : null}
                </View>
              </BentoCard>
            ))}
          </View>
        </Animated.View>

        {/* ── 7-day Trends ── */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.trendSection}>
          <Text style={styles.sectionTitle}>7-day pulse</Text>
          <View style={styles.trendRow}>
            <TrendSparkline dataPoints={trendSleep?.data_points ?? []} label="Sleep" />
            <TrendSparkline dataPoints={trendSteps?.data_points ?? []} label="Steps" />
            <TrendSparkline dataPoints={trendCalories?.data_points ?? []} label="Calories" />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 100, // room for floating tab bar
    gap: 16,
  },

  /* Greeting */
  greetingBlock: {
    gap: 2,
  },
  greetingLabel: {
    fontSize: 15,
    color: theme.colors.text.muted,
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.text.primary,
    letterSpacing: 0.3,
  },

  /* Streak pill */
  streakPill: {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
  },
  streakGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  streakFire: {
    fontSize: 18,
  },
  streakCount: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.green.primary,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  streakDivider: {
    width: 1,
    height: 16,
    backgroundColor: theme.colors.ui.divider,
    marginHorizontal: 4,
  },
  streakMini: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.muted,
  },

  /* Section headers */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.muted,
  },

  /* Bento grid */
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },

  /* Metric card content */
  metricIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.muted,
    letterSpacing: 0.5,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  metricUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.muted,
  },

  /* Trends */
  trendSection: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 12,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
});
