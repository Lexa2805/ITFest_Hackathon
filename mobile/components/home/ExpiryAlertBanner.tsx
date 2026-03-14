import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ExpiryAlertItem } from '@/services/expiryApi';
import { theme } from '@/constants/theme';

type Props = {
  items: ExpiryAlertItem[];
  onViewRecipes?: () => void;
};

export function ExpiryAlertBanner({ items, onViewRecipes }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.heading}>⚠️ Expiring Soon</Text>
      {items.map((item) => (
        <View key={item.item_id} style={styles.row}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.status}>
            {item.status === 'expired' ? 'Expired' : item.days_until_expiry === 0 ? 'Today' : 'Tomorrow'}
          </Text>
        </View>
      ))}
      {onViewRecipes && (
        <TouchableOpacity onPress={onViewRecipes} style={styles.link} accessibilityRole="button">
          <Text style={styles.linkText}>View recipes to use these up →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(255,82,82,0.08)',
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 8,
  },
  heading: { fontSize: 14, fontWeight: '700', color: theme.colors.error },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: theme.colors.text.primary },
  status: { fontSize: 12, fontWeight: '600', color: theme.colors.error },
  link: { marginTop: 4 },
  linkText: { fontSize: 13, fontWeight: '600', color: theme.colors.green.primary },
});
