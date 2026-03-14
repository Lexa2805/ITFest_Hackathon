import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/recipe/ScreenHeader';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { SkeletonCard } from '@/components/recipe/SkeletonCard';
import { useRecipeFlowStore } from '@/stores/recipeFlowStore';
import { useProfileContext } from '@/contexts/ProfileContext';
import type { RecipeSuggestion } from '@/services/recipeApi';
import { theme } from '@/constants/theme';

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
  const { suggestions, isLoadingSuggestions, suggestionsError, fetchSuggestions, selectRecipe } = useRecipeFlowStore();

  useEffect(() => { fetchSuggestions(buildUserProfile(profile)); }, []);

  const handleRecipePress = (recipe: RecipeSuggestion) => {
    selectRecipe(recipe);
    router.push(`/recipe-detail/${recipe.id}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Tonight's Picks" />

      {isLoadingSuggestions && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </ScrollView>
      )}

      {!isLoadingSuggestions && suggestionsError && (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text style={styles.stateText}>Couldn't load suggestions</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchSuggestions(buildUserProfile(profile))}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!isLoadingSuggestions && !suggestionsError && suggestions.length === 0 && (
        <View style={styles.stateContainer}>
          <Ionicons name="search-outline" size={48} color={theme.colors.text.muted} />
          <Text style={styles.stateText}>No matching recipes found</Text>
          <Text style={styles.stateSubtext}>Try adding more items to your fridge for better matches.</Text>
        </View>
      )}

      {!isLoadingSuggestions && !suggestionsError && suggestions.length > 0 && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {suggestions.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onPress={handleRecipePress} />)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.main },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 32 },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  stateText: { color: theme.colors.text.primary, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  stateSubtext: { color: theme.colors.text.muted, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: 'rgba(57,255,136,0.12)', borderRadius: theme.radius.sm, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryText: { color: theme.colors.green.primary, fontSize: 14, fontWeight: '700' },
});
