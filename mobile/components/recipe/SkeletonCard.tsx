import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.titleLine, { opacity }]} />
      <Animated.View style={[styles.shortLine, { opacity }]} />
      <Animated.View style={[styles.shortLine, { opacity, width: '50%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 140,
    backgroundColor: '#13121C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(247,244,239,0.10)',
    padding: 14,
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 12,
  },
  titleLine: { height: 16, borderRadius: 6, backgroundColor: '#1E1D2A', width: '70%' },
  shortLine: { height: 12, borderRadius: 6, backgroundColor: '#1E1D2A', width: '90%' },
});
