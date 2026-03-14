import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/recipe/ScreenHeader';
import { DayCard } from '@/components/recipe/DayCard';
import { MealSwapModal } from '@/components/recipe/MealSwapModal';
import { useRecipeFlowStore } from '@/stores/recipeFlowStore';
import { useProfileContext } from '@/contexts/ProfileContext';
import { theme } from '@/constants/theme';
import { NeonButton } from '@/components/ui/NeonButton';

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
  const { weekPlan, isLoadingPlan, planError, isLoadingShoppingList, fetchWeeklyPlan, fetchShoppingList } = useRecipeFlowStore();

  const [swapModal, setSwapModal] = useState({ visible: false, currentMealName: '', mealType: '', dayIndex: 0, mealIndex: 0 });

  useEffect(() => { fetchWeeklyPlan(buildUserProfile(profile)); }, []);

  const handleSwapMeal = useCallback((dayIndex: number, mealIndex: number, mealType: string) => {
    const meal = weekPlan?.[dayIndex]?.meals?.[mealIndex];
    setSwapModal({ visible: true, currentMealName: meal?.recipe?.name ?? 'Unknown', mealType, dayIndex, mealIndex });
  }, [weekPlan]);

  const handleCloseSwap = useCallback(() => { setSwapModal((prev) => ({ ...prev, visible: false })); }, []);

  const handleGetShoppingList = async () => {
    if (!weekPlan || isLoadingShoppingList) return;
    const allRecipes = weekPlan.flatMap((day) => (day.meals ?? []).map((m) => m.recipe).filter(Boolean));
    if (allRecipes.length === 0) return;
    await fetchShoppingList(allRecipes);
    router.push('/shopping-list');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Your Week" />

      {isLoadingPlan && (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={theme.colors.green.primary} size="large" />
          <Text style={styles.stateText}>Generating your week...</Text>
        </View>
      )}

      {!isLoadingPlan && planError && (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text style={styles.stateText}>Couldn't generate your plan</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchWeeklyPlan(buildUserProfile(profile))}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!isLoadingPlan && !planError && weekPlan && (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            {weekPlan.map((dayPlan, index) => (
              <DayCard key={dayPlan.day ?? index} dayPlan={dayPlan} dayIndex={index} onSwapMeal={handleSwapMeal} />
            ))}
          </ScrollView>
          <View style={styles.bottomBar}>
            <NeonButton label="Get Shopping List" onPress={handleGetShoppingList} disabled={isLoadingShoppingList} loading={isLoadingShoppingList} />
          </View>
        </>
      )}

      <MealSwapModal visible={swapModal.visible} currentMealName={swapModal.currentMealName} mealType={swapModal.mealType} dayIndex={swapModal.dayIndex} mealIndex={swapModal.mealIndex} onClose={handleCloseSwap} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.main },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 120 },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  stateText: { color: theme.colors.text.primary, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  retryBtn: { backgroundColor: 'rgba(57,255,136,0.12)', borderRadius: theme.radius.sm, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryText: { color: theme.colors.green.primary, fontSize: 14, fontWeight: '700' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 32,
    backgroundColor: theme.colors.background.main,
    borderTopWidth: 1, borderTopColor: theme.colors.ui.divider,
  },
});
