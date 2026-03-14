import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DayPlan } from '@/services/recipeApi';

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
            <Text style={styles.recipeName} numberOfLines={1}>
              {meal.recipe?.name ?? 'Unknown'}
            </Text>
          </View>
          <Text style={styles.mealKcal}>{meal.recipe?.metadata?.macros?.kcal ?? 0} kcal</Text>
          <Pressable
            onPress={() => onSwapMeal(dayIndex, mi, meal.meal_type)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Swap ${meal.meal_type}`}
          >
            <Ionicons name="swap-horizontal" size={20} color="#39FF88" />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#13121C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(247,244,239,0.10)',
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: { color: '#F7F4EF', fontSize: 16, fontWeight: '700' },
  macrosBadge: {
    backgroundColor: 'rgba(57,255,136,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  macrosText: { color: '#39FF88', fontSize: 11, fontWeight: '600' },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247,244,239,0.06)',
  },
  mealInfo: { flex: 1, gap: 2 },
  mealType: {
    color: '#C8C1B6',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  recipeName: { color: '#F7F4EF', fontSize: 14 },
  mealKcal: { color: '#C8C1B6', fontSize: 12, marginRight: 4 },
  emptyMsg: { color: '#6B6780', fontSize: 13, fontStyle: 'italic' },
});
