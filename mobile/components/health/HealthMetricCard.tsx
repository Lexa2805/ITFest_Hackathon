import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type HealthMetricCardProps = {
  title: string;
  totalLabel: string;
  totalValue: string;
  averageLabel: string;
  averageValue: string;
  samples: number;
};

export function HealthMetricCard({
  title,
  totalLabel,
  totalValue,
  averageLabel,
  averageValue,
  samples,
}: HealthMetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>{totalLabel}</Text>
        <Text style={styles.value}>{totalValue}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>{averageLabel}</Text>
        <Text style={styles.value}>{averageValue}</Text>
      </View>
      <Text style={styles.samples}>Samples: {samples}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 8,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: theme.colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    color: theme.colors.text.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  samples: {
    color: theme.colors.text.muted,
    fontSize: 11,
    fontWeight: '500',
  },
});
