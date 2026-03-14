/**
 * NeonButton — primary CTA with neon glow pulse on press.
 * Supports "primary" (filled green) and "ghost" (outlined) variants.
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface NeonButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function NeonButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: NeonButtonProps) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const isPrimary = variant === 'primary';

  return (
    <Animated.View style={[styles.wrapper, style]}>
      {/* Glow layer behind button */}
      <Animated.View
        style={[
          styles.glowLayer,
          glowStyle,
          isPrimary && styles.glowLayerPrimary,
        ]}
      />
      <AnimatedPressable
        onPress={onPress}
        disabled={disabled || loading}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
          glowOpacity.value = withTiming(1, { duration: 150 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
          glowOpacity.value = withTiming(0, { duration: 300 });
        }}
        style={[
          animatedStyle,
          styles.button,
          isPrimary ? styles.buttonPrimary : styles.buttonGhost,
          (disabled || loading) && styles.buttonDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {loading ? (
          <ActivityIndicator
            color={isPrimary ? theme.buttons.primary.text : theme.colors.green.primary}
            size="small"
          />
        ) : (
          <Text
            style={[
              styles.label,
              isPrimary ? styles.labelPrimary : styles.labelGhost,
            ]}
          >
            {label}
          </Text>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.md,
    backgroundColor: 'transparent',
  },
  glowLayerPrimary: {
    ...theme.glow.primary,
  },
  button: {
    borderRadius: theme.radius.md,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: theme.buttons.primary.background,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.green.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  labelPrimary: {
    color: theme.buttons.primary.text,
  },
  labelGhost: {
    color: theme.colors.green.primary,
  },
});
