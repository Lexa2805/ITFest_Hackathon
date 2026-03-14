import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { theme } from '@/constants/theme';

type DataPoint = { date: string; value: number };

type Props = {
  dataPoints: DataPoint[];
  label?: string;
  width?: number;
  height?: number;
};

export function TrendSparkline({ dataPoints, label, width = 140, height = 40 }: Props) {
  if (dataPoints.length < 2) {
    return (
      <View style={styles.container}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Text style={styles.insufficient}>Insufficient data</Text>
      </View>
    );
  }

  const values = dataPoints.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={theme.colors.green.primary} />
            <Stop offset="100%" stopColor={theme.colors.chart.dark} />
          </LinearGradient>
        </Defs>
        <Path d={d} stroke="url(#sparkGrad)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: 12, fontWeight: '600', color: theme.colors.text.muted },
  insufficient: { fontSize: 12, fontWeight: '500', color: theme.colors.text.muted, fontStyle: 'italic' },
});
