import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBriefingStore } from '@/stores/briefingStore';
import { theme } from '@/constants/theme';

function toMotivationalSummary(source?: string | null): string {
  if (!source || source.trim().length === 0) {
    return "You're building momentum today. Keep moving with one focused workout and stay hydrated.";
  }
  const normalized = source.replace(/\s+/g, ' ').replace(/[•\-*]+/g, ' ').trim();
  const lower = normalized.toLowerCase();
  if (lower.includes('recover') || lower.includes('sleep') || lower.includes('rest')) {
    return "You're recovering well today. Your body is ready for light movement — keep it up.";
  }
  if (lower.includes('stress') || lower.includes('fatigue')) {
    return 'Today is a reset day. Keep intensity light, breathe deep, and finish with a short walk.';
  }
  if (lower.includes('steps') || lower.includes('active') || lower.includes('energy')) {
    return 'Your consistency is paying off. Add one quality session today and keep the streak alive.';
  }
  const firstSentence = normalized.split(/[.!?]+/)[0]?.trim();
  if (firstSentence && firstSentence.length >= 18) {
    const clipped = firstSentence.slice(0, 130).trim();
    return clipped.endsWith('.') ? clipped : `${clipped}.`;
  }
  return "You're on track today. Stay consistent with smart movement and strong recovery habits.";
}

export function DailyBriefingCard() {
  const { briefing, loading, error, fetchBriefing } = useBriefingStore();

  useEffect(() => {
    fetchBriefing();
  }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>AI SUMMARY</Text>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '80%' }]} />
      </View>
    );
  }

  const narrative = toMotivationalSummary(error ?? briefing?.narrative);

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(57,255,136,0.04)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.label}>AI SUMMARY</Text>
      <Text style={styles.narrative} numberOfLines={3}>
        "{narrative}"
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.secondary,
    padding: 18,
    gap: 8,
    overflow: 'hidden',
  },
  label: {
    color: theme.colors.green.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  narrative: {
    color: theme.colors.text.secondary,
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  skeletonLine: {
    height: 14,
    borderRadius: 6,
    backgroundColor: 'rgba(57,255,136,0.04)',
    width: '100%',
  },
});
