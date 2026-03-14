import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLifeScoreStore } from '@/stores/lifeScoreStore';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LifeScoreDetailModal({ visible, onClose }: Props) {
  const { lifeScore, isLoading, error, generateLifeScore } = useLifeScoreStore();

  const formattedDate = lifeScore?.created_at
    ? new Date(lifeScore.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const isRateLimited = error?.includes('upload new health data') || error?.includes('wait');

  const handleRecalculate = async () => {
    await generateLifeScore();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Life Score</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.closeButton}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {lifeScore ? (
            <>
              <View style={styles.gradeCircle}>
                <Text style={styles.gradeText}>{lifeScore.score}</Text>
              </View>

              {formattedDate && (
                <Text style={styles.date}>Generated {formattedDate}</Text>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Summary</Text>
                <Text style={styles.bodyText}>{lifeScore.summary}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Strengths</Text>
                {lifeScore.top_strengths.map((s, i) => (
                  <View key={i} style={styles.listItem}>
                    <Text style={styles.bulletAccent}>✦</Text>
                    <Text style={styles.bodyText}>{s}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Areas for Improvement</Text>
                {lifeScore.areas_for_improvement.map((a, i) => (
                  <View key={i} style={styles.listItem}>
                    <Text style={styles.bulletMuted}>▸</Text>
                    <Text style={styles.bodyText}>{a}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Life Score Yet</Text>
              <Text style={styles.emptyBody}>
                Generate your first wellness grade based on your health data and profile.
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.recalcButton,
              (isLoading || isRateLimited) && styles.recalcButtonDisabled,
            ]}
            onPress={handleRecalculate}
            disabled={isLoading || isRateLimited}
            accessibilityRole="button"
            accessibilityLabel={lifeScore ? 'Recalculate Life Score' : 'Generate Life Score'}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.background.main} size="small" />
            ) : (
              <Text style={styles.recalcButtonText}>
                {lifeScore ? 'Recalculate' : 'Generate Life Score'}
              </Text>
            )}
          </TouchableOpacity>

          {isRateLimited && (
            <Text style={styles.rateLimitHint}>
              Upload new health data or wait for the cooldown period to recalculate.
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.main,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    color: theme.colors.green.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    alignItems: 'center',
    gap: 20,
    paddingBottom: 40,
  },
  gradeCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(57,255,136,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...theme.glow.primary,
  },
  gradeText: {
    color: theme.colors.green.primary,
    fontSize: 40,
    fontWeight: '800',
  },
  date: {
    color: theme.colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    width: '100%',
    gap: 8,
  },
  sectionTitle: {
    color: theme.colors.green.primary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bodyText: {
    color: theme.colors.text.secondary,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  bulletAccent: {
    color: theme.colors.green.primary,
    fontSize: 14,
    marginTop: 3,
  },
  bulletMuted: {
    color: theme.colors.text.muted,
    fontSize: 14,
    marginTop: 3,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  emptyTitle: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyBody: {
    color: theme.colors.text.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBanner: {
    width: '100%',
    backgroundColor: 'rgba(255,82,82,0.12)',
    borderRadius: theme.radius.sm,
    padding: 12,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  recalcButton: {
    width: '100%',
    backgroundColor: theme.colors.green.primary,
    borderRadius: theme.radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  recalcButtonDisabled: {
    opacity: 0.4,
  },
  recalcButtonText: {
    color: theme.colors.background.main,
    fontSize: 16,
    fontWeight: '700',
  },
  rateLimitHint: {
    color: theme.colors.text.muted,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});
