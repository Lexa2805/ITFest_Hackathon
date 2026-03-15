/**
 * FlexProfileScreen — interactive friend profile with steal/nudge actions.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { getFlexProfile, type FlexProfile } from '@/services/flexProfileApi';
import { useSquadStore } from '@/stores/squadStore';
import { useMessageStore } from '@/stores/messageStore';
import { theme } from '@/constants/theme';

const NUDGE_TEMPLATES = [
  'Time for the gym!',
  'Have you logged your meals today?',
  "Let's hit our goals today!",
] as const;

export default function FlexProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = id ?? '';

  const [profile, setProfile] = useState<FlexProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNudge, setShowNudge] = useState(false);

  const { stealWorkout, stealRecipes, isLoading: stealLoading } = useSquadStore();
  const { sendNudge } = useMessageStore();

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getFlexProfile(userId)
      .then(setProfile)
      .catch((err) => {
        setError(err?.response?.data?.detail || err?.message || 'Failed to load profile');
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleStealWorkout = useCallback(async () => {
    try {
      await stealWorkout(userId);
      Alert.alert('Done', 'Workout split copied to your plan');
    } catch {
      Alert.alert('Oops', 'Could not steal workout');
    }
  }, [userId, stealWorkout]);

  const handleStealRecipes = useCallback(async () => {
    try {
      await stealRecipes(userId);
      Alert.alert('Done', 'Recipes copied to your collection');
    } catch {
      Alert.alert('Oops', 'Could not steal recipes');
    }
  }, [userId, stealRecipes]);

  const handleNudge = useCallback(
    async (template: (typeof NUDGE_TEMPLATES)[number]) => {
      setShowNudge(false);
      try {
        await sendNudge({ friend_user_id: userId, template });
        Alert.alert('Sent', 'Nudge delivered');
      } catch {
        Alert.alert('Oops', 'Could not send nudge');
      }
    },
    [userId, sendNudge],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: 'Profile', headerStyle: styles.header, headerTitleStyle: styles.headerTitle, headerTintColor: theme.colors.text.primary }} />
        <ActivityIndicator size="large" color={theme.colors.green.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: 'Profile', headerStyle: styles.header, headerTitleStyle: styles.headerTitle, headerTintColor: theme.colors.text.primary }} />
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.colors.error} />
          <Text style={styles.errorText}>{error ?? 'Profile not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: profile.display_name ?? 'Profile',
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerTintColor: theme.colors.text.primary,
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Life Score hero */}
        <LinearGradient colors={theme.gradients.glow} style={styles.heroCard}>
          <Text style={styles.heroLabel}>Life Score</Text>
          <Text style={styles.heroScore}>{profile.life_score ?? '—'}</Text>
          {profile.life_score_summary && (
            <Text style={styles.heroSummary}>{profile.life_score_summary}</Text>
          )}
        </LinearGradient>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard icon="flame" label="Streaks" value={formatStreaks(profile.streaks)} />
          <StatCard icon="trophy" label="Badges" value={String(profile.badges.length)} />
        </View>

        {/* Active plans */}
        {(profile.active_workout_split || profile.current_recipe_plan) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Plans</Text>
            {profile.active_workout_split && (
              <View style={styles.planRow}>
                <Ionicons name="barbell-outline" size={16} color={theme.colors.green.soft} />
                <Text style={styles.planText}>{profile.active_workout_split}</Text>
              </View>
            )}
            {profile.current_recipe_plan && (
              <View style={styles.planRow}>
                <Ionicons name="restaurant-outline" size={16} color={theme.colors.green.soft} />
                <Text style={styles.planText}>{profile.current_recipe_plan}</Text>
              </View>
            )}
          </View>
        )}

        {/* Steal My Routine */}
        {(profile.can_steal_workout || profile.can_steal_recipes) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Steal My Routine</Text>
            <View style={styles.actionRow}>
              {profile.can_steal_workout && (
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                  onPress={handleStealWorkout}
                  disabled={stealLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Steal workout split"
                >
                  <Ionicons name="barbell" size={18} color={theme.colors.background.main} />
                  <Text style={styles.actionBtnText}>Steal Workout</Text>
                </Pressable>
              )}
              {profile.can_steal_recipes && (
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                  onPress={handleStealRecipes}
                  disabled={stealLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Steal recipes"
                >
                  <Ionicons name="restaurant" size={18} color={theme.colors.background.main} />
                  <Text style={styles.actionBtnText}>Steal Recipes</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Nudge */}
        <Pressable
          style={({ pressed }) => [styles.nudgeBtn, pressed && styles.nudgeBtnPressed]}
          onPress={() => setShowNudge(!showNudge)}
          accessibilityRole="button"
          accessibilityLabel="Send a nudge"
        >
          <Ionicons name="notifications-outline" size={18} color={theme.colors.green.primary} />
          <Text style={styles.nudgeBtnText}>Nudge</Text>
        </Pressable>

        {showNudge && (
          <View style={styles.nudgeSheet}>
            {NUDGE_TEMPLATES.map((t) => (
              <Pressable
                key={t}
                style={({ pressed }) => [styles.nudgeOption, pressed && styles.nudgeOptionPressed]}
                onPress={() => handleNudge(t)}
                accessibilityRole="button"
                accessibilityLabel={`Send nudge: ${t}`}
              >
                <Text style={styles.nudgeOptionText}>{t}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Helpers ── */

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={18} color={theme.colors.green.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatStreaks(streaks: Record<string, unknown> | null): string {
  if (!streaks) return '0';
  const vals = Object.values(streaks)
    .map((v) => (typeof v === 'object' && v && 'current_streak' in v ? (v as any).current_streak : 0))
    .filter((n) => typeof n === 'number');
  return vals.length ? String(Math.max(...vals)) : '0';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background.main },
  header: { backgroundColor: theme.colors.background.main },
  headerTitle: { color: theme.colors.text.primary, fontWeight: '700', fontSize: 17 },
  loader: { marginTop: 60 },
  scroll: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 100, gap: 16 },

  /* Error */
  errorWrap: { alignItems: 'center', marginTop: 80, gap: 12 },
  errorText: { fontSize: 15, fontWeight: '600', color: theme.colors.error, textAlign: 'center' },

  /* Hero */
  heroCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  heroLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text.muted },
  heroScore: { fontSize: 48, fontWeight: '800', color: theme.colors.green.primary },
  heroSummary: { fontSize: 13, color: theme.colors.text.secondary, textAlign: 'center', marginTop: 4 },

  /* Stats */
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: theme.colors.text.primary },
  statLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.text.muted },

  /* Section */
  section: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text.primary },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planText: { fontSize: 14, color: theme.colors.text.secondary, flex: 1 },

  /* Actions */
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.green.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
  },
  actionBtnPressed: { opacity: 0.8 },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.background.main },

  /* Nudge */
  nudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.green.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
  },
  nudgeBtnPressed: { opacity: 0.7 },
  nudgeBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.green.primary },
  nudgeSheet: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: 8,
    gap: 4,
  },
  nudgeOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.radius.sm,
  },
  nudgeOptionPressed: { backgroundColor: theme.colors.background.elevated },
  nudgeOptionText: { fontSize: 15, color: theme.colors.text.primary, fontWeight: '500' },
});
