import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLifeScoreStore } from '@/stores/lifeScoreStore';
import { LifeScoreDetailModal } from './LifeScoreDetailModal';

const C = {
  card: '#141414',
  border: '#1E1E1E',
  accent: '#00E676',
  accentSoft: 'rgba(0,230,118,0.15)',
  title: '#F5F5F5',
  body: '#C8D1CC',
  muted: '#93A19A',
  skeleton: '#1E1E1E',
} as const;

export function LifeScoreWidget() {
  const { lifeScore, isLoading } = useLifeScoreStore();
  const [modalVisible, setModalVisible] = useState(false);

  if (isLoading && !lifeScore) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Life Score</Text>
        <View style={styles.skeletonCircle} />
      </View>
    );
  }

  if (!lifeScore) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Generate your first Life Score"
      >
        <Text style={styles.label}>Life Score</Text>
        <View style={styles.emptyCircle}>
          <Text style={styles.emptyGrade}>?</Text>
        </View>
        <Text style={styles.prompt}>
          Tap to generate your first wellness grade
        </Text>
        <LifeScoreDetailModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setModalVisible(true)}
      accessibilityRole="button"
      accessibilityLabel={`Life Score: ${lifeScore.score}. Tap for details.`}
    >
      <Text style={styles.label}>Life Score</Text>
      <View style={styles.gradeCircle}>
        <Text style={styles.gradeText}>{lifeScore.score}</Text>
      </View>
      <Text style={styles.summary} numberOfLines={2}>
        {lifeScore.summary}
      </Text>
      <LifeScoreDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </TouchableOpacity>
  );
}


const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
    alignItems: 'center',
    gap: 10,
  },
  label: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    alignSelf: 'flex-start',
  },
  gradeCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: C.accent,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    color: C.accent,
    fontSize: 32,
    fontWeight: '800',
  },
  summary: {
    color: C.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: C.muted,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGrade: {
    color: C.muted,
    fontSize: 32,
    fontWeight: '700',
  },
  prompt: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  skeletonCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.skeleton,
  },
});
