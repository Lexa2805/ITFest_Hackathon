import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RecipeSuggestion } from '@/services/recipeApi';

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
      <ImageBackground
        source={{ uri: undefined }}
        style={styles.bg}
        imageStyle={styles.bgImage}
      >
        {/* Glassmorphism overlay */}
        <View style={styles.overlay}>
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
        </View>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  pressed: { opacity: 0.8 },
  bg: { minHeight: 140 },
  bgImage: { borderRadius: 16 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(19,18,28,0.82)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(247,244,239,0.10)',
    padding: 14,
    justifyContent: 'flex-end',
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  name: { flex: 1, color: '#F7F4EF', fontSize: 16, fontWeight: '700' },
  badge: {
    backgroundColor: 'rgba(57,255,136,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: '#39FF88', fontSize: 12, fontWeight: '700' },
  macros: { color: '#C8C1B6', fontSize: 12 },
  missing: { color: '#E7836D', fontSize: 12, fontWeight: '600' },
});
