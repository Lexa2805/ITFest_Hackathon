import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/recipe/ScreenHeader';
import { ShoppingCategory } from '@/components/recipe/ShoppingCategory';
import { useRecipeFlowStore } from '@/stores/recipeFlowStore';
import type { ShoppingItem } from '@/services/recipeApi';
import { theme } from '@/constants/theme';

const CATEGORY_ORDER = ['Produce', 'Protein', 'Dairy', 'Grains', 'Pantry'];

function groupByCategory(items: ShoppingItem[]) {
  const groups: Record<string, ShoppingItem[]> = {};
  for (const item of items) {
    const cat = item.category || 'Other';
    (groups[cat] ??= []).push(item);
  }
  const ordered: { category: string; items: ShoppingItem[] }[] = [];
  for (const cat of CATEGORY_ORDER) {
    if (groups[cat]) { ordered.push({ category: cat, items: groups[cat] }); delete groups[cat]; }
  }
  for (const [cat, catItems] of Object.entries(groups)) {
    ordered.push({ category: cat === 'Other' ? 'Other' : cat, items: catItems });
  }
  return ordered;
}

export default function ShoppingListScreen() {
  const { shoppingList, isLoadingShoppingList, shoppingListError, fetchShoppingList, selectedRecipe, weekPlan } = useRecipeFlowStore();

  const handleRetry = () => {
    if (weekPlan) { fetchShoppingList(weekPlan.flatMap((day) => day.meals.map((m) => m.recipe))); }
    else if (selectedRecipe) { fetchShoppingList([selectedRecipe]); }
  };

  if (isLoadingShoppingList) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Shopping List" />
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.colors.green.primary} />
          <Text style={styles.stateText}>{weekPlan ? 'Building your weekly list...' : 'Building your list...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (shoppingListError) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Shopping List" />
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text style={styles.stateText}>Couldn't generate shopping list</Text>
          <Pressable style={styles.retryBtn} onPress={handleRetry}><Text style={styles.retryText}>Retry</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (shoppingList.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Shopping List" />
        <View style={styles.stateContainer}>
          <Ionicons name="checkmark-circle" size={48} color={theme.colors.chart.medium} />
          <Text style={styles.stateText}>You have everything you need!</Text>
        </View>
      </SafeAreaView>
    );
  }

  const grouped = groupByCategory(shoppingList);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Shopping List" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {grouped.map((group) => <ShoppingCategory key={group.category} category={group.category} items={group.items} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.main },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 32 },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  stateText: { color: theme.colors.text.primary, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  retryBtn: { backgroundColor: 'rgba(57,255,136,0.12)', borderRadius: theme.radius.sm, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryText: { color: theme.colors.green.primary, fontSize: 14, fontWeight: '700' },
});
