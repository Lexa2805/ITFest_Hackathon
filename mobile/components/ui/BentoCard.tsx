/**
 * BentoCard — bento-box grid card with optional neon glow highlight.
 * Uses subtle background differentiation instead of borders.
 */

import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface BentoCardProps {
  children: React.ReactNode;
  highlighted?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  span?: 1 | 2; // 1 = half width, 2 = full width
}

export function BentoCard({
  children,
  highlighted = false,
  onPress,
  style,
  span = 1,
}: BentoCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const Wrapper = onPress ? AnimatedPressable : Animated.View;

  return (
    <Wrapper
      style={[
        animatedStyle,
        styles.card,
        span === 2 && styles.cardFull,
        highlighted && styles.cardHighlighted,
        style,
      ]}
      {...(onPress
        ? {
            onPress,
            onPressIn: () => {
              scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
            },
            onPressOut: () => {
              scale.value = withSpring(1, { damping: 15, stiffness: 300 });
            },
          }
        : {})}
    >
      {children}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    width: '48%',
    minHeight: 120,
  },
  cardFull: {
    width: '100%',
  },
  cardHighlighted: {
    backgroundColor: theme.colors.background.elevated,
    ...theme.glow.subtle,
  },
});
