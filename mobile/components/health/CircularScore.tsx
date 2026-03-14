import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { theme } from '@/constants/theme';

type CircularScoreProps = {
    score: number;
    size?: number;
    strokeWidth?: number;
    label?: string;
};

export function CircularScore({ score, size = 170, strokeWidth = 14, label = 'Physical State' }: CircularScoreProps) {
    const clamped = Math.max(0, Math.min(100, score));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progressOffset = circumference * (1 - clamped / 100);

    return (
        <View style={styles.container}>
            <Svg width={size} height={size}>
                <Defs>
                    <LinearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor={theme.colors.green.primary} />
                        <Stop offset="100%" stopColor={theme.colors.chart.dark} />
                    </LinearGradient>
                </Defs>
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(57,255,136,0.08)" strokeWidth={strokeWidth} fill="none" />
                <Circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke="url(#scoreGrad)" strokeWidth={strokeWidth} fill="none"
                    strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={progressOffset}
                    rotation="-90" originX={size / 2} originY={size / 2}
                />
            </Svg>
            <View style={styles.centerContent}>
                <Text style={styles.scoreText}>{clamped}</Text>
                <Text style={styles.outOfText}>/100</Text>
                <Text style={styles.labelText}>{label}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { justifyContent: 'center', alignItems: 'center' },
    centerContent: { position: 'absolute', justifyContent: 'center', alignItems: 'center', gap: 1 },
    scoreText: { color: theme.colors.text.primary, fontSize: 34, fontWeight: '800', lineHeight: 38 },
    outOfText: { color: theme.colors.text.muted, fontSize: 13, fontWeight: '600' },
    labelText: { marginTop: 2, color: theme.colors.text.secondary, fontSize: 12, fontWeight: '600' },
});
