/**
 * LifeScoreWidget — premium circular progress ring with animated score.
 * Tappable to open detail modal. Neon glow on the ring.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLifeScoreStore } from '@/stores/lifeScoreStore';
import { LifeScoreDetailModal } from './LifeScoreDetailModal';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { theme } from '@/constants/theme';

export function LifeScoreWidget() {
  const { lifeScore, isLoading } = useLifeScoreStore();
  const [modalVisible, setModalVisible] = useState(false);

  // Subtle pulse animation for the glow
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 2000 }),
        withTiming(0.4, { duration: 2000 }),
      ),
      -1,
      true,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const score = lifeScore?.score ?? 0;
  const progress = score / 100;

  if (isLoading && !lifeScore) {
    return (
      <View style={styles.shell}>
        <View style={styles.skeletonRing} />
        <View style={styles.skeletonLines}>
          <View style={[styles.skeletonBar, { width: '60%' }]} />
          <View style={[styles.skeletonBar, { width: '80%' }]} />
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.shell}
      onPress={() => setModalVisible(true)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={lifeScore ? `Life Score: ${score}. Tap for details.` : 'Generate your first Life Score'}
    >
      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(57,255,136,0.04)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Glow pulse behind ring */}
      <Animated.View style={[styles.glowOrb, pulseStyle]} />

      <Animated.View entering={FadeIn.duration(800)} style={styles.content}>
        <View style={styles.ringSection}>
          <CircularProgress
            size={140}
            strokeWidth={8}
            progress={progress}
            gradientColors={[theme.colors.green.primary, theme.colors.chart.dark]}
          >
            <Text style={styles.scoreNumber}>{lifeScore ? score : '--'}</Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </CircularProgress>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.widgetTitle}>LIFE SCORE</Text>
          <Text style={styles.widgetDate}>Today</Text>
          {lifeScore?.summary ? (
            <Text style={styles.summary} numberOfLines={3}>
              {lifeScore.summary}
            </Text>
          ) : (
            <Text style={styles.summary}>
              Tap to generate your first personalized wellness score.
            </Text>
          )}
        </View>
      </Animated.View>

      <LifeScoreDetailModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </TouchableOpacity>
  );
}


const styles = StyleSheet.create({
  shell: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.secondary,
    overflow: 'hidden',
    minHeight: 180,
    position: 'relative',
  },
  glowOrb: {
    position: 'absolute',
    top: -20,
    left: '20%',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(57,255,136,0.12)',
  },
  content: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    alignItems: 'center',
  },
  ringSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: -1,
    lineHeight: 46,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.muted,
    marginTop: -2,
  },
  infoSection: {
    flex: 1,
    gap: 4,
  },
  widgetTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.muted,
    letterSpacing: 1.5,
  },
  widgetDate: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.green.primary,
  },
  summary: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 18,
    marginTop: 4,
  },

  /* Skeleton */
  skeletonRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(57,255,136,0.04)',
    alignSelf: 'center',
    marginTop: theme.spacing.lg,
  },
  skeletonLines: {
    padding: theme.spacing.lg,
    gap: 8,
  },
  skeletonBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(57,255,136,0.04)',
  },
});
