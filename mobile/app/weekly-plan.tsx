import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/recipe/ScreenHeader';
import { DayCard } from '@/components/recipe/DayCard';
import { MealSwapModal } from '@/components/recipe/MealSwapModal';
import { useRecipeFlowStore } from '@/stores/recipeFlowStore';
import { useProfileContext } from '@/contexts/ProfileContext';

function buildUserProfile(profile: any) {
  return {
    dietary_restrictions: profile?.dietary_restrictions ?? [],
    daily_calorie_goal: profile?.daily_calorie_goal ?? 2000,
    weekly_budget: profile?.weekly_budget ?? null,
  };
}

export default function WeeklyPlanScreen() {
  const router = useRouter();
  const { profile } = useProfileContext();
  const {
    weekPlan,
    isLoadingPlan,
    planError,
    isLoadingShoppingList,
    fetchWeeklyPlan,
    fetchShoppingList,
  } = useRecipeFlowStore();

  // Meal swap modal state
  const [swapModal, setSwapModal] = useState({
    visible: false,
    currentMealName: '',
    mealType: '',
    dayIndex: 0,
    mealIndex: 0,
  });

  useEffect(() => {
    fetchWeeklyPlan(buildUserProfile(profile));
  }, []);

  const handleSwapMeal = useCallback(
    (dayIndex: number, mealIndex: number, mealType: string) => {
      const meal = weekPlan?.[dayIndex]?.meals?.[mealIndex];
      setSwapModal({
        visible: true,
        currentMealName: meal?.recipe?.name ?? 'Unknown',
        mealType,
        dayIndex,
        mealIndex,
      });
    },
    [weekPlan],
  );

  const handleCloseSwap = useCallback(() => {
    setSwapModal((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleRetry = () => {
    fetchWeeklyPlan(buildUserProfile(profile));
  };

  const handleGetShoppingList = async () => {
    if (!weekPlan || isLoadingShoppingList) return;
    const allRecipes = weekPlan.flatMap((day) =>
      (day.meals ?? []).map((m) => m.recipe).filter(Boolean),
    );
    if (allRecipes.length === 0) return;
    await fetchShoppingList(allRecipes);
    router.push('/shopping-list');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Your Week" />

      {/* Loading */}
      {isLoadingPlan && (
        <View style={styles.stateContainer}>
          <ActivityIndicator color="#F2A65A" size="large" />
          <Text style={styles.stateText}>Generating your week...</Text>
        </View>
      )}

      {/* Error */}
      {!isLoadingPlan && planError && (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#E7836D" />
          <Text style={styles.stateText}>Couldn't generate your plan</Text>
          <Pressable style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Plan */}
      {!isLoadingPlan && !planError && weekPlan && (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            {weekPlan.map((dayPlan, index) => (
              <DayCard
                key={dayPlan.day ?? index}
                dayPlan={dayPlan}
                dayIndex={index}
                onSwapMeal={handleSwapMeal}
              />
            ))}
          </ScrollView>

          <View style={styles.bottomBar}>
            <Pressable
              style={[styles.primaryBtn, isLoadingShoppingList && styles.primaryBtnDisabled]}
              onPress={handleGetShoppingList}
              disabled={isLoadingShoppingList}
              accessibilityRole="button"
              accessibilityLabel="Get Shopping List"
            >
              {isLoadingShoppingList ? (
                <ActivityIndicator color="#0D0D14" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Get Shopping List</Text>
              )}
            </Pressable>
          </View>
        </>
      )}

      {/* Meal Swap Modal */}
      <MealSwapModal
        visible={swapModal.visible}
        currentMealName={swapModal.currentMealName}
        mealType={swapModal.mealType}
        dayIndex={swapModal.dayIndex}
        mealIndex={swapModal.mealIndex}
        onClose={handleCloseSwap}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D14' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 120 },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  stateText: { color: '#F7F4EF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  retryBtn: {
    backgroundColor: 'rgba(242,166,90,0.15)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryText: { color: '#F2A65A', fontSize: 14, fontWeight: '700' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: '#0D0D14',
    borderTopWidth: 1,
    borderTopColor: 'rgba(247,244,239,0.08)',
  },
  primaryBtn: {
    backgroundColor: '#F2A65A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#0D0D14', fontSize: 16, fontWeight: '700' },
});
