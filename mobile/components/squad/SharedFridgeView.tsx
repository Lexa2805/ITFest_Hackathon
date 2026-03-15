/**
 * SharedFridgeView — combined fridge inventory grouped by owner.
 * Flags items expiring within 3 days and offers shared shopping list generation.
 */

import React from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import type { SharedFridgeItem } from '@/services/squadApi';

interface SharedFridgeViewProps {
  items: SharedFridgeItem[];
  isLoading: boolean;
  onGenerateShoppingList: () => void;
  generatingList?: boolean;
}

interface Section {
  title: string;
  data: SharedFridgeItem[];
}

export function SharedFridgeView({
  items,
  isLoading,
  onGenerateShoppingList,
  generatingList = false,
}: SharedFridgeViewProps) {
  // Group items by owner
  const sections: Section[] = React.useMemo(() => {
    const grouped = new Map<string, SharedFridgeItem[]>();
    for (const item of items) {
      const key = item.owner_display_name ?? item.owner_user_id;
      const list = grouped.get(key) ?? [];
      list.push(item);
      grouped.set(key, list);
    }
    return Array.from(grouped.entries()).map(([title, data]) => ({ title, data }));
  }, [items]);

  if (isLoading && items.length === 0) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.green.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="cube-outline" size={32} color={theme.colors.text.muted} />
        <Text style={styles.emptyText}>No linked fridges yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => <FridgeItemRow item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
      <Pressable
        style={({ pressed }) => [styles.shopBtn, pressed && styles.shopBtnPressed]}
        onPress={onGenerateShoppingList}
        disabled={generatingList}
        accessibilityRole="button"
        accessibilityLabel="Generate shared shopping list"
      >
        {generatingList ? (
          <ActivityIndicator size="small" color={theme.colors.background.main} />
        ) : (
          <>
            <Ionicons name="cart-outline" size={16} color={theme.colors.background.main} />
            <Text style={styles.shopBtnText}>Generate Shared Shopping List</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function FridgeItemRow({ item }: { item: SharedFridgeItem }) {
  const qty = item.quantity != null ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : null;

  return (
    <View style={[styles.row, item.expiring_soon && styles.rowExpiring]}>
      <View style={styles.rowLeft}>
        <Text style={styles.itemName}>{item.name}</Text>
        {qty && <Text style={styles.itemQty}>{qty}</Text>}
      </View>
      {item.expiring_soon && (
        <View style={styles.expiryBadge} accessibilityLabel="Expiring soon">
          <Ionicons name="warning" size={12} color={theme.colors.error} />
          <Text style={styles.expiryText}>Expiring</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { alignItems: 'center', paddingVertical: 40 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '600', color: theme.colors.text.muted },
  list: { paddingBottom: 12 },

  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.green.soft,
    paddingVertical: 8,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  rowExpiring: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error,
  },
  rowLeft: { flex: 1, gap: 2 },
  itemName: { fontSize: 14, fontWeight: '600', color: theme.colors.text.primary },
  itemQty: { fontSize: 12, color: theme.colors.text.muted },

  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,82,82,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  expiryText: { fontSize: 11, fontWeight: '700', color: theme.colors.error },

  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.green.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 14,
    marginTop: 8,
  },
  shopBtnPressed: { opacity: 0.8 },
  shopBtnText: { fontSize: 14, fontWeight: '700', color: theme.colors.background.main },
});
