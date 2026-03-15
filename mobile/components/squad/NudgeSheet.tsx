/**
 * NudgeSheet — bottom sheet with predefined nudge templates.
 * Tapping a template sends a nudge via messageStore.sendNudge.
 */

import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

const NUDGE_TEMPLATES = [
  'Time for the gym!',
  'Have you logged your meals today?',
  "Let's hit our goals today!",
] as const;

export type NudgeTemplate = (typeof NUDGE_TEMPLATES)[number];

interface NudgeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (template: NudgeTemplate) => void;
}

export function NudgeSheet({ visible, onClose, onSelect }: NudgeSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Send a Nudge</Text>
        {NUDGE_TEMPLATES.map((template) => (
          <Pressable
            key={template}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            onPress={() => onSelect(template)}
            accessibilityRole="button"
            accessibilityLabel={`Send nudge: ${template}`}
          >
            <Ionicons name="notifications-outline" size={16} color={theme.colors.green.primary} />
            <Text style={styles.optionText}>{template}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: theme.colors.background.secondary,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    gap: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.ui.divider,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: theme.radius.sm,
  },
  optionPressed: {
    backgroundColor: theme.colors.background.elevated,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
});
