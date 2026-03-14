import React from 'react';
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

import { ScreenHeader } from '@/components/recipe/ScreenHeader';
import { ShoppingCategory } from '@/components/recipe/ShoppingCategory';
import { useRecipeFlowStore } from '@/stores/recipeFlowStore';
import type { ShoppingItem } from '@/services/recipeApi';

const CATEGORY_ORDER = ['Produce', 'Protein', 'Dairy', 'Grains', 'Pantry'];

function groupByCategory(items: ShoppingItem[]) {
  const groups: Record<string, ShoppingItem[]> = {};
  for (const item of items) {
    const cat = item.category || 'Other';
    (groups[cat] ??= []).push(item);
  }

  const ordered: { category: string; items: ShoppingItem[] }[] = [];
  for (const cat of CATEGORY_ORDER) {
    if (groups[cat]) {
      ordered.push({ category: cat, items: groups[cat] });
      delete groups[cat];
    }
  }
  // Append remaining categories as "Other"
  for (const [cat, catItems] of Object.entries(groups)) {
    ordered.push({ category: cat === 'Other' ? 'Other' : cat, items: catItems });
  }
  return ordered;
}

export default function ShoppingListScreen() {
  const {
    shoppingList,
    isLoadingShoppingList,
    shoppingListError,
    fetchShoppingList,
    selectedRecipe,
    weekPlan,
  } = useRecipeFlowStore();

  const handleRetry = () => {
    // Determine which recipes to retry with based on context
    if (weekPlan) {
      const allRecipes = weekPlan.flatMap((day) =>
        day.meals.map((m) => m.recipe)
      );
      fetchShoppingList(allRecipes);
    } else if (selectedRecipe) {
      fetchShoppingList([selectedRecipe]);
    }
  };

  // Loading
  if (isLoadingShoppingList) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Shopping List" />
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#39FF88" />
          <Text style={styles.stateText}>
            {weekPlan ? 'Building your weekly list...' : 'Building your list...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error
  if (shoppingListError) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Shopping List" />
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#E7836D" />
          <Text style={styles.stateText}>Couldn't generate shopping list</Text>
          <Pressable style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Empty
  if (shoppingList.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Shopping List" />
        <View style={styles.stateContainer}>
          <Ionicons name="checkmark-circle" size={48} color="#4ADE80" />
          <Text style={styles.stateText}>You have everything you need!</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Results
  const grouped = groupByCategory(shoppingList);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Shopping List" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {grouped.map((group) => (
          <ShoppingCategory
            key={group.category}
            category={group.category}
            items={group.items}
          />
        ))}
      </ScrollView>
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
  retryBtn: {
    backgroundColor: 'rgba(57,255,136,0.15)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryText: { color: '#39FF88', fontSize: 14, fontWeight: '700' },
});
