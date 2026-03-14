import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '@/constants/theme';

interface CalorieRingProps {
  consumed: number;
  target: number;
}

const SIZE = 150;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CalorieRing({ consumed, target }: CalorieRingProps) {
  const remaining = Math.max(target - consumed, 0);
  const ratio = target > 0 ? Math.min(consumed / target, 1) : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - ratio);

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Background track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="rgba(57,255,136,0.12)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={theme.colors.green.primary}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={styles.centerLabel}>
        <Text style={styles.remainingNumber}>{remaining}</Text>
        <Text style={styles.remainingText}>remaining</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  remainingNumber: {
    color: theme.colors.green.primary,
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 40,
  },
  remainingText: {
    color: theme.colors.green.soft,
    fontSize: 12,
    fontWeight: '600',
  },
});
