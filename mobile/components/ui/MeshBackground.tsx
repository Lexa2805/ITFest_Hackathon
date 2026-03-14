/**
 * MeshBackground — layered gradient background for auth/splash screens.
 * Creates a subtle radial glow effect using stacked LinearGradients.
 */

import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';

interface MeshBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function MeshBackground({ children, style }: MeshBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      {/* Base dark gradient */}
      <LinearGradient
        colors={[theme.colors.background.main, '#0B100E', theme.colors.background.main]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Radial-ish green glow at top */}
      <LinearGradient
        colors={['rgba(57,255,136,0.06)', 'rgba(57,255,136,0.02)', 'transparent']}
        locations={[0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle side accent */}
      <LinearGradient
        colors={['rgba(31,143,85,0.05)', 'transparent']}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 1, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
});
