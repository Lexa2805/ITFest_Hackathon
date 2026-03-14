import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface FlowEntryCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

export function FlowEntryCard({ icon, title, subtitle, onPress }: FlowEntryCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={theme.colors.green.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.green.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 12,
  },
  pressed: { opacity: 0.7 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(57,255,136,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: 2 },
  title: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '700' },
  subtitle: { color: theme.colors.text.secondary, fontSize: 12 },
});
