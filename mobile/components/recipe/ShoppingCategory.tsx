import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ShoppingItem } from '@/services/recipeApi';

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
        <Ionicons name={icon} size={18} color="#39FF88" />
        <Text style={styles.categoryName}>{category}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.itemRow}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemQty}>
            {item.quantity_needed} {item.unit}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 6, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  categoryName: { color: '#F7F4EF', fontSize: 15, fontWeight: '700' },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247,244,239,0.06)',
  },
  itemName: { color: '#C8C1B6', fontSize: 14, flex: 1 },
  itemQty: { color: '#39FF88', fontSize: 13, fontWeight: '600' },
});
