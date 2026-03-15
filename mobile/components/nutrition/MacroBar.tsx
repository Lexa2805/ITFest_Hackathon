import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { theme } from '@/constants/theme';

interface MacroBarProps {
  label: string;
  consumed: number;
  target: number;
}

function MacroIcon({ label }: { label: string }) {
  // Leaf icon for Protein/Carbs, droplet for Fats
  if (label === 'Fats') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2C12 2 6 10 6 15a6 6 0 0 0 12 0c0-5-6-13-6-13Z"
          stroke={theme.colors.green.primary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  }
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 8C8 10 5.9 16.17 3.82 21.34L3 21l1-1c2-2 3.5-4 3.5-7 0-4 3-8 8-10l1.5 5Z"
        stroke={theme.colors.green.primary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M17 8c2.5 0 5 2.5 5 6 0 3.5-2 5.5-4 7l-1-1"
        stroke={theme.colors.green.primary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function MacroBar({ label, consumed, target }: MacroBarProps) {
  const ratio = target > 0 ? Math.min(consumed / target, 1) : 0;
  const isOver = consumed > target && target > 0;

  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <MacroIcon label={label} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.trackWrap}>
        <View style={styles.track}>
          <LinearGradient
            colors={isOver ? ['#FF6B6B', '#FF8E53'] : [theme.colors.green.primary, theme.colors.chart.dark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${ratio * 100}%` }]}
          />
        </View>
      </View>
      <Text style={[styles.value, isOver && styles.valueOver]}>
        {consumed}g / {target}g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 22,
    alignItems: 'center',
  },
  label: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    width: 60,
  },
  trackWrap: {
    flex: 1,
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(57,255,136,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: theme.radius.full,
  },
  value: {
    color: theme.colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  valueOver: {
    color: '#FF6B6B',
  },
});
