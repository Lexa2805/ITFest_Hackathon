import React, { useEffect } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenHeader } from '@/components/recipe/ScreenHeader';
import { useRecipeFlowStore } from '@/stores/recipeFlowStore';
import { theme } from '@/constants/theme';
import { NeonButton } from '@/components/ui/NeonButton';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedRecipe, recipeInstructions, isLoadingInstructions, instructionsError, fetchRecipeInstructions, fetchShoppingList, isLoadingShoppingList } = useRecipeFlowStore();

  useEffect(() => { if (id) fetchRecipeInstructions(id); }, [id]);

  const macros = selectedRecipe?.metadata?.macros;
  const ingredients = selectedRecipe?.metadata?.ingredients ?? [];
  const missing = new Set((selectedRecipe?.missing_ingredients ?? []).map((i) => i.toLowerCase()));

  const handleGenerateShoppingList = () => {
    if (!selectedRecipe || isLoadingShoppingList) return;
    fetchShoppingList([selectedRecipe]);
    router.push('/shopping-list');
  };

  const matchPct = selectedRecipe ? `${Math.round(selectedRecipe.match_score * 100)}%` : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={selectedRecipe?.name ?? 'Recipe'}
        rightElement={matchPct ? <View style={styles.badge}><Text style={styles.badgeText}>{matchPct}</Text></View> : undefined}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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

        {(recipeInstructions?.source_url || selectedRecipe?.source_url) && (
          <Pressable onPress={() => Linking.openURL(recipeInstructions?.source_url ?? selectedRecipe!.source_url)} accessibilityRole="link">
            <Text style={styles.sourceLink}>View original source</Text>
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>Ingredients</Text>
        {ingredients.map((ingredient, idx) => {
          const isMissing = missing.has(ingredient.toLowerCase());
          return (
            <View key={idx} style={styles.ingredientRow}>
              <View style={[styles.dot, { backgroundColor: isMissing ? theme.colors.error : theme.colors.chart.medium }]} />
              <Text style={[styles.ingredientText, { color: isMissing ? theme.colors.error : theme.colors.text.secondary }]}>{ingredient}</Text>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Instructions</Text>

        {isLoadingInstructions && (
          <View style={styles.instructionsLoading}>
            <ActivityIndicator color={theme.colors.green.primary} size="small" />
            <Text style={styles.loadingText}>Loading instructions…</Text>
          </View>
        )}

        {!isLoadingInstructions && instructionsError && (
          <View style={styles.instructionsError}>
            <Ionicons name="alert-circle-outline" size={28} color={theme.colors.error} />
            <Text style={styles.errorText}>Instructions unavailable</Text>
            <Pressable style={styles.retryBtn} onPress={() => { if (id) fetchRecipeInstructions(id); }}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!isLoadingInstructions && !instructionsError && recipeInstructions?.instructions?.map((step, idx) => (
          <View key={idx} style={styles.stepRow}>
            <Text style={styles.stepNumber}>{idx + 1}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomBar}>
        <NeonButton label="Generate Shopping List" onPress={handleGenerateShoppingList} disabled={isLoadingShoppingList} loading={isLoadingShoppingList} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.main },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 100 },
  badge: { backgroundColor: 'rgba(57,255,136,0.14)', borderRadius: theme.radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: theme.colors.green.primary, fontSize: 13, fontWeight: '700' },
  macroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  macroItem: { color: theme.colors.text.secondary, fontSize: 13 },
  macroDot: { color: theme.colors.text.muted, fontSize: 13 },
  sourceLink: { color: theme.colors.green.primary, fontSize: 13, marginBottom: 20, textDecorationLine: 'underline' },
  sectionTitle: { color: theme.colors.text.primary, fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  ingredientText: { fontSize: 14 },
  instructionsLoading: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  loadingText: { color: theme.colors.text.muted, fontSize: 13 },
  instructionsError: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  errorText: { color: theme.colors.error, fontSize: 14, fontWeight: '600' },
  retryBtn: { backgroundColor: 'rgba(57,255,136,0.12)', borderRadius: theme.radius.sm, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryText: { color: theme.colors.green.primary, fontSize: 14, fontWeight: '700' },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stepNumber: { color: theme.colors.green.primary, fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'right' },
  stepText: { color: theme.colors.text.secondary, fontSize: 14, flex: 1, lineHeight: 20 },
  bottomBar: { paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.ui.divider },
});
