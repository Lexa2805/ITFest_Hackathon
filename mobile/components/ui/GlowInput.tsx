/**
 * GlowInput — animated text input with neon-green focus glow.
 * Floating label animates up on focus/value.
 */

import React, { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';

interface GlowInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: boolean;
}

export function GlowInput({ label, error, value, onFocus, onBlur, ...rest }: GlowInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focus = useSharedValue(0);
  const hasValue = Boolean(value && value.length > 0);

  const labelStyle = useAnimatedStyle(() => {
    const isUp = focus.value > 0.5 || hasValue;
    return {
      transform: [
        { translateY: interpolate(focus.value, [0, 1], [hasValue ? -14 : 0, -14]) },
        { scale: interpolate(focus.value, [0, 1], [hasValue ? 0.8 : 1, 0.8]) },
      ],
      color: interpolateColor(
        focus.value,
        [0, 1],
        [theme.colors.text.muted, theme.colors.green.primary],
      ),
    };
  });

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      [error ? theme.colors.error : theme.colors.ui.divider, error ? theme.colors.error : theme.colors.green.primary],
    ),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focus.value, [0, 1], [0, 0.3]),
  }));

  return (
    <View style={styles.container}>
      {/* Glow behind input */}
      <Animated.View style={[styles.glowBg, glowStyle]} />

      <Animated.View style={[styles.inputWrap, borderStyle]}>
        <Animated.Text style={[styles.floatingLabel, labelStyle, hasValue && !isFocused && styles.floatingLabelUp]}>
          {label}
        </Animated.Text>
        <TextInput
          style={styles.input}
          value={value}
          placeholderTextColor="transparent"
          onFocus={(e) => {
            setIsFocused(true);
            focus.value = withTiming(1, { duration: 200 });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (!hasValue) {
              focus.value = withTiming(0, { duration: 200 });
            }
            onBlur?.(e);
          }}
          {...rest}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    position: 'relative',
  },
  glowBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.green.primary,
    top: -2,
    bottom: -2,
    left: -2,
    right: -2,
  },
  inputWrap: {
    backgroundColor: theme.colors.background.elevated,
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 10,
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    left: 16,
    top: 18,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text.muted,
  },
  floatingLabelUp: {
    transform: [{ translateY: -14 }, { scale: 0.8 }],
    color: theme.colors.text.secondary,
  },
  input: {
    fontSize: 16,
    color: theme.colors.text.primary,
    padding: 0,
    minHeight: 22,
  },
});
