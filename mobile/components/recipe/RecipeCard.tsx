import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { RecipeSuggestion } from '@/services/recipeApi';
import { theme } from '@/constants/theme';

interface RecipeCardProps {
  recipe: RecipeSuggestion;
  onPress: (recipe: RecipeSuggestion) => void;
}

export function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  const { name, match_score, metadata, missing_ingredients } = recipe;
  const macros = metadata?.macros;
  const pct = Math.round((match_score ?? 0) * 100);
  const missingCount = missing_ingredients?.length ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onPress(recipe)}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${pct}% match`}
    >
      <LinearGradient
        colors={['rgba(57,255,136,0.04)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topRow}>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pct}%</Text>
        </View>
      </View>
      <Text style={styles.macros}>
        {macros?.kcal ?? 0} kcal · {macros?.protein ?? 0}g P · {macros?.fat ?? 0}g F · {macros?.carbs ?? 0}g C
      </Text>
      {missingCount > 0 && (
        <Text style={styles.missing}>
          {missingCount} ingredient{missingCount !== 1 ? 's' : ''} missing
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.8 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  name: { flex: 1, color: theme.colors.text.primary, fontSize: 16, fontWeight: '700' },
  badge: {
    backgroundColor: 'rgba(57,255,136,0.14)',
    borderRadius: theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: theme.colors.green.primary, fontSize: 12, fontWeight: '700' },
  macros: { color: theme.colors.text.secondary, fontSize: 12 },
  missing: { color: theme.colors.error, fontSize: 12, fontWeight: '600' },
});
