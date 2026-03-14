import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, rightElement }: ScreenHeaderProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());

  return (
    <View style={styles.container}>
      <Pressable onPress={handleBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
        <Ionicons name="chevron-back" size={26} color={theme.colors.text.primary} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.right}>{rightElement}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: theme.colors.background.main,
  },
  title: { flex: 1, color: theme.colors.text.primary, fontSize: 20, fontWeight: '700' },
  right: { minWidth: 26 },
});
