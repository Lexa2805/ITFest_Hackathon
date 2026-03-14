import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

const LABELS: Record<string, string> = {
  checkin: 'Check-ins',
  meal_logged: 'Meals Logged',
  calorie_goal: 'Calorie Goal',
};

type Props = {
  activityType: string;
  currentStreak: number;
};

export function StreakBadge({ activityType, currentStreak }: Props) {
  const label = LABELS[activityType] ?? activityType;

  return (
    <View style={styles.badge}>
      <Text style={styles.emoji}>🔥</Text>
      <Text style={styles.count}>{currentStreak}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 90,
    gap: 2,
  },
  emoji: {
    fontSize: 20,
  },
  count: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.green.primary,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.muted,
    textAlign: 'center',
  },
});
