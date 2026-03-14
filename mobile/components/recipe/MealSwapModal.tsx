import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRecipeFlowStore } from '@/stores/recipeFlowStore';
import { useProfileContext } from '@/contexts/ProfileContext';
import type { RecipeSuggestion } from '@/services/recipeApi';

interface MealSwapModalProps {
  visible: boolean;
  currentMealName: string;
  mealType: string;
  dayIndex: number;
  mealIndex: number;
  onClose: () => void;
}

export function MealSwapModal({
  visible,
  currentMealName,
  mealType,
  dayIndex,
  mealIndex,
  onClose,
}: MealSwapModalProps) {
  const { profile } = useProfileContext();
  const {
    suggestions,
    isLoadingSuggestions,
    suggestionsError,
    fetchSuggestions,
    swapMeal,
  } = useRecipeFlowStore();

  useEffect(() => {
    if (visible) {
      const userProfile = {
        dietary_restrictions: (profile as any)?.dietary_restrictions ?? [],
        daily_calorie_goal: (profile as any)?.daily_calorie_goal ?? 2000,
      };
      fetchSuggestions(userProfile, mealType);
    }
  }, [visible, mealType]);

  const handleSelect = (recipe: RecipeSuggestion) => {
    swapMeal(dayIndex, mealIndex, recipe);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Swap meal</Text>
              <Text style={styles.currentMeal}>{currentMealName}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color="#F7F4EF" />
            </Pressable>
          </View>

          {/* Body */}
          {isLoadingSuggestions && (
            <View style={styles.center}>
              <ActivityIndicator color="#39FF88" size="large" />
            </View>
          )}

          {suggestionsError && !isLoadingSuggestions && (
            <View style={styles.center}>
              <Text style={styles.errorText}>Couldn't load alternatives</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => {
                  const userProfile = {
                    dietary_restrictions: (profile as any)?.dietary_restrictions ?? [],
                    daily_calorie_goal: (profile as any)?.daily_calorie_goal ?? 2000,
                  };
                  fetchSuggestions(userProfile, mealType);
                }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {!isLoadingSuggestions && !suggestionsError && (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {suggestions.map((recipe) => (
                <Pressable
                  key={recipe.id}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => handleSelect(recipe)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recipeName} numberOfLines={1}>{recipe.name}</Text>
                    <Text style={styles.macroText}>
                      {recipe.metadata?.macros?.kcal ?? 0} kcal · {recipe.metadata?.macros?.protein ?? 0}g P
                    </Text>
                  </View>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{Math.round((recipe.match_score ?? 0) * 100)}%</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#13121C',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247,244,239,0.08)',
  },
  title: { color: '#F7F4EF', fontSize: 18, fontWeight: '700' },
  currentMeal: { color: '#6B6780', fontSize: 13, marginTop: 2 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { color: '#E7836D', fontSize: 14 },
  retryBtn: {
    backgroundColor: 'rgba(57,255,136,0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: { color: '#39FF88', fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247,244,239,0.06)',
    gap: 10,
  },
  rowPressed: { opacity: 0.6 },
  recipeName: { color: '#F7F4EF', fontSize: 14, fontWeight: '600' },
  macroText: { color: '#C8C1B6', fontSize: 12, marginTop: 2 },
  scoreBadge: {
    backgroundColor: 'rgba(57,255,136,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreText: { color: '#39FF88', fontSize: 12, fontWeight: '700' },
});
