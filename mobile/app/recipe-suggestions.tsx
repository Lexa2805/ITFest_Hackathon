import React, { useEffect } from 'react';
import {
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
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { SkeletonCard } from '@/components/recipe/SkeletonCard';
import { useRecipeFlowStore } from '@/stores/recipeFlowStore';
import { useProfileContext } from '@/contexts/ProfileContext';
import type { RecipeSuggestion } from '@/services/recipeApi';

function buildUserProfile(profile: any) {
  return {
    dietary_restrictions: profile?.dietary_restrictions ?? [],
    daily_calorie_goal: profile?.daily_calorie_goal ?? 2000,
    weekly_budget: profile?.weekly_budget ?? null,
  };
}

export default function RecipeSuggestionsScreen() {
  const router = useRouter();
  const { profile } = useProfileContext();
  const {
    suggestions,
    isLoadingSuggestions,
    suggestionsError,
    fetchSuggestions,
    selectRecipe,
  } = useRecipeFlowStore();

  useEffect(() => {
    fetchSuggestions(buildUserProfile(profile));
  }, []);

  const handleRecipePress = (recipe: RecipeSuggestion) => {
    selectRecipe(recipe);
    router.push(`/recipe-detail/${recipe.id}`);
  };

  const handleRetry = () => {
    fetchSuggestions(buildUserProfile(profile));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Tonight's Picks" />

      {/* Loading */}
      {isLoadingSuggestions && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </ScrollView>
      )}

      {/* Error */}
      {!isLoadingSuggestions && suggestionsError && (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#E7836D" />
          <Text style={styles.stateText}>Couldn't load suggestions</Text>
          <Pressable style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Empty */}
      {!isLoadingSuggestions && !suggestionsError && suggestions.length === 0 && (
        <View style={styles.stateContainer}>
          <Ionicons name="search-outline" size={48} color="#6B6780" />
          <Text style={styles.stateText}>No matching recipes found</Text>
          <Text style={styles.stateSubtext}>
            Try adding more items to your fridge for better matches.
          </Text>
        </View>
      )}

      {/* Results */}
      {!isLoadingSuggestions && !suggestionsError && suggestions.length > 0 && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {suggestions.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onPress={handleRecipePress}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D14' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  stateText: { color: '#F7F4EF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  stateSubtext: { color: '#6B6780', fontSize: 13, textAlign: 'center' },
  retryBtn: {
    backgroundColor: 'rgba(57,255,136,0.15)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryText: { color: '#39FF88', fontSize: 14, fontWeight: '700' },
});
