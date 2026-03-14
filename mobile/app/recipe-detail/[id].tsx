import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/recipe/ScreenHeader';
import { useRecipeFlowStore } from '@/stores/recipeFlowStore';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    selectedRecipe,
    recipeInstructions,
    isLoadingInstructions,
    instructionsError,
    fetchRecipeInstructions,
    fetchShoppingList,
    isLoadingShoppingList,
  } = useRecipeFlowStore();

  useEffect(() => {
    if (id) fetchRecipeInstructions(id);
  }, [id]);

  const macros = selectedRecipe?.metadata?.macros;
  const ingredients = selectedRecipe?.metadata?.ingredients ?? [];
  const missing = new Set(
    (selectedRecipe?.missing_ingredients ?? []).map((i) => i.toLowerCase()),
  );

  const handleGenerateShoppingList = () => {
    if (!selectedRecipe || isLoadingShoppingList) return;
    fetchShoppingList([selectedRecipe]);
    router.push('/shopping-list');
  };

  const handleRetryInstructions = () => {
    if (id) fetchRecipeInstructions(id);
  };

  const matchPct = selectedRecipe
    ? `${Math.round(selectedRecipe.match_score * 100)}%`
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={selectedRecipe?.name ?? 'Recipe'}
        rightElement={
          matchPct ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{matchPct}</Text>
            </View>
          ) : undefined
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Macros */}
        {macros && (
          <View style={styles.macroRow}>
            <Text style={styles.macroItem}>{macros.kcal} kcal</Text>
            <Text style={styles.macroDot}>·</Text>
            <Text style={styles.macroItem}>{macros.protein}g P</Text>
            <Text style={styles.macroDot}>·</Text>
            <Text style={styles.macroItem}>{macros.fat}g F</Text>
            <Text style={styles.macroDot}>·</Text>
            <Text style={styles.macroItem}>{macros.carbs}g C</Text>
          </View>
        )}

        {/* Source link */}
        {(recipeInstructions?.source_url || selectedRecipe?.source_url) && (
          <Pressable
            onPress={() =>
              Linking.openURL(
                recipeInstructions?.source_url ?? selectedRecipe!.source_url,
              )
            }
            accessibilityRole="link"
          >
            <Text style={styles.sourceLink}>View original source</Text>
          </Pressable>
        )}

        {/* Ingredients */}
        <Text style={styles.sectionTitle}>Ingredients</Text>
        {ingredients.map((ingredient, idx) => {
          const isMissing = missing.has(ingredient.toLowerCase());
          return (
            <View key={idx} style={styles.ingredientRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: isMissing ? '#E7836D' : '#6BCB77' },
                ]}
              />
              <Text
                style={[
                  styles.ingredientText,
                  { color: isMissing ? '#E7836D' : '#C8C1B6' },
                ]}
              >
                {ingredient}
              </Text>
            </View>
          );
        })}

        {/* Instructions */}
        <Text style={styles.sectionTitle}>Instructions</Text>

        {isLoadingInstructions && (
          <View style={styles.instructionsLoading}>
            <ActivityIndicator color="#F2A65A" size="small" />
            <Text style={styles.loadingText}>Loading instructions…</Text>
          </View>
        )}

        {!isLoadingInstructions && instructionsError && (
          <View style={styles.instructionsError}>
            <Ionicons name="alert-circle-outline" size={28} color="#E7836D" />
            <Text style={styles.errorText}>Instructions unavailable</Text>
            <Pressable style={styles.retryBtn} onPress={handleRetryInstructions}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!isLoadingInstructions &&
          !instructionsError &&
          recipeInstructions?.instructions?.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{idx + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={styles.bottomBar}>
        <Pressable
          style={[
            styles.primaryBtn,
            isLoadingShoppingList && styles.primaryBtnDisabled,
          ]}
          onPress={handleGenerateShoppingList}
          disabled={isLoadingShoppingList}
          accessibilityRole="button"
          accessibilityLabel="Generate Shopping List"
        >
          {isLoadingShoppingList ? (
            <ActivityIndicator color="#0D0D14" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Generate Shopping List</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D14' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 100 },

  /* Badge */
  badge: {
    backgroundColor: 'rgba(242,166,90,0.18)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { color: '#F2A65A', fontSize: 13, fontWeight: '700' },

  /* Macros */
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  macroItem: { color: '#C8C1B6', fontSize: 13 },
  macroDot: { color: '#6B6780', fontSize: 13 },

  /* Source */
  sourceLink: { color: '#F2A65A', fontSize: 13, marginBottom: 20, textDecorationLine: 'underline' },

  /* Section */
  sectionTitle: {
    color: '#F7F4EF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
  },

  /* Ingredients */
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  ingredientText: { fontSize: 14 },

  /* Instructions loading / error */
  instructionsLoading: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  loadingText: { color: '#6B6780', fontSize: 13 },
  instructionsError: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  errorText: { color: '#E7836D', fontSize: 14, fontWeight: '600' },
  retryBtn: {
    backgroundColor: 'rgba(242,166,90,0.15)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryText: { color: '#F2A65A', fontSize: 14, fontWeight: '700' },

  /* Steps */
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stepNumber: {
    color: '#F2A65A',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'right',
  },
  stepText: { color: '#C8C1B6', fontSize: 14, flex: 1, lineHeight: 20 },

  /* Bottom bar */
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107,103,128,0.2)',
  },
  primaryBtn: {
    backgroundColor: '#F2A65A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#0D0D14', fontSize: 15, fontWeight: '700' },
});
