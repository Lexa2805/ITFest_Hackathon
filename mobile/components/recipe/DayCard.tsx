import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DayPlan } from '@/services/recipeApi';
import { theme } from '@/constants/theme';

interface DayCardProps {
  dayPlan: DayPlan;
  dayIndex: number;
  onSwapMeal: (dayIndex: number, mealIndex: number, mealType: string) => void;
}

export function DayCard({ dayPlan, dayIndex, onSwapMeal }: DayCardProps) {
  const { day, meals, daily_macros } = dayPlan;

  if (!meals || meals.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.dayName}>{day}</Text>
        <Text style={styles.emptyMsg}>No recipes matched for this day</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.dayName}>{day}</Text>
        <View style={styles.macrosBadge}>
          <Text style={styles.macrosText}>
            {daily_macros?.kcal?.toLocaleString() ?? 0} kcal · {daily_macros?.protein ?? 0}g protein
          </Text>
        </View>
      </View>
      {meals.map((meal, mi) => (
        <View key={mi} style={styles.mealRow}>
          <View style={styles.mealInfo}>
            <Text style={styles.mealType}>{meal.meal_type}</Text>
            <Text style={styles.recipeName} numberOfLines={1}>{meal.recipe?.name ?? 'Unknown'}</Text>
          </View>
          <Text style={styles.mealKcal}>{meal.recipe?.metadata?.macros?.kcal ?? 0} kcal</Text>
          <Pressable onPress={() => onSwapMeal(dayIndex, mi, meal.meal_type)} hitSlop={10} accessibilityRole="button">
            <Ionicons name="swap-horizontal" size={20} color={theme.colors.green.primary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 10,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayName: { color: theme.colors.text.primary, fontSize: 16, fontWeight: '700' },
  macrosBadge: {
    backgroundColor: 'rgba(57,255,136,0.1)',
    borderRadius: theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  macrosText: { color: theme.colors.green.primary, fontSize: 11, fontWeight: '600' },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ui.divider,
  },
  mealInfo: { flex: 1, gap: 2 },
  mealType: { color: theme.colors.text.muted, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  recipeName: { color: theme.colors.text.primary, fontSize: 14 },
  mealKcal: { color: theme.colors.text.secondary, fontSize: 12, marginRight: 4 },
  emptyMsg: { color: theme.colors.text.muted, fontSize: 13, fontStyle: 'italic' },
});
