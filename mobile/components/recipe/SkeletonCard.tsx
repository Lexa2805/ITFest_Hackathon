import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';

export function SkeletonCard() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.titleLine, animStyle]} />
      <Animated.View style={[styles.shortLine, animStyle]} />
      <Animated.View style={[styles.shortLine, animStyle, { width: '50%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 120,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: 16,
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 12,
  },
  titleLine: { height: 16, borderRadius: 6, backgroundColor: 'rgba(57,255,136,0.06)', width: '70%' },
  shortLine: { height: 12, borderRadius: 6, backgroundColor: 'rgba(57,255,136,0.06)', width: '90%' },
});
