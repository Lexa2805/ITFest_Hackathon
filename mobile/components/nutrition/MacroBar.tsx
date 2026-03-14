import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';

interface MacroBarProps {
  label: string;
  consumed: number;
  target: number;
}

export function MacroBar({ label, consumed, target }: MacroBarProps) {
  const ratio = target > 0 ? Math.min(consumed / target, 1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {consumed}g / {target}g
        </Text>
      </View>
      <View style={styles.track}>
        <LinearGradient
          colors={[theme.colors.green.primary, theme.colors.chart.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${ratio * 100}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: theme.colors.text.primary, fontSize: 13, fontWeight: '600' },
  value: { color: theme.colors.text.muted, fontSize: 12 },
  track: {
    width: '100%',
    height: 6,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(57,255,136,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: theme.radius.full,
  },
});
