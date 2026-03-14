import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ShoppingItem } from '@/services/recipeApi';
import { theme } from '@/constants/theme';

interface ShoppingCategoryProps {
  category: string;
  items: ShoppingItem[];
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Produce: 'leaf-outline',
  Protein: 'fish-outline',
  Dairy: 'water-outline',
  Grains: 'nutrition-outline',
  Pantry: 'cube-outline',
};

export function ShoppingCategory({ category, items }: ShoppingCategoryProps) {
  const icon = CATEGORY_ICONS[category] ?? 'ellipse-outline';

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name={icon} size={18} color={theme.colors.green.primary} />
        <Text style={styles.categoryName}>{category}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.itemRow}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemQty}>{item.quantity_needed} {item.unit}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 6, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  categoryName: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '700' },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ui.divider,
  },
  itemName: { color: theme.colors.text.secondary, fontSize: 14, flex: 1 },
  itemQty: { color: theme.colors.green.primary, fontSize: 13, fontWeight: '600' },
});
