/**
 * MessageBubble — polymorphic message renderer for squad chat.
 * Renders text, system/nudge, meal_share, recipe_share, and agent_response types.
 * Shows sender display name and supports tapping sender to view their profile.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';
import type { Message } from '@/services/messageApi';

interface MessageBubbleProps {
  message: Message;
  currentUserId?: string | null;
  onFork?: (messageId: string) => void;
}

export function MessageBubble({ message, currentUserId, onFork }: MessageBubbleProps) {
  const meta = message.metadata as Record<string, unknown> | undefined;
  const isOwn = currentUserId != null && message.sender_id === currentUserId;

  switch (message.message_type) {
    case 'system':
      return <SystemBubble content={message.content} meta={meta} />;
    case 'agent_response':
      return <AgentBubble content={message.content} />;
    case 'meal_share':
      return (
        <MealShareBubble
          content={message.content}
          meta={meta}
          messageId={message.id}
          senderName={message.sender_display_name}
          senderId={message.sender_id}
          isOwn={isOwn}
          onFork={onFork}
        />
      );
    case 'recipe_share':
      return (
        <RecipeShareBubble
          content={message.content}
          meta={meta}
          messageId={message.id}
          senderName={message.sender_display_name}
          senderId={message.sender_id}
          isOwn={isOwn}
          onFork={onFork}
        />
      );
    default:
      return (
        <TextBubble
          content={message.content}
          senderName={message.sender_display_name}
          senderId={message.sender_id}
          isOwn={isOwn}
        />
      );
  }
}


/* ── Helpers ── */

function SenderLabel({ name, senderId, isOwn }: { name?: string | null; senderId?: string | null; isOwn: boolean }) {
  if (isOwn || !name) return null;
  return (
    <Pressable
      onPress={() => senderId && router.push(`/flex-profile/${senderId}`)}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={`View ${name}'s profile`}
    >
      <Text style={styles.senderName}>{name}</Text>
    </Pressable>
  );
}

/* ── Sub-components ── */

function TextBubble({ content, senderName, senderId, isOwn }: { content: string; senderName?: string | null; senderId?: string | null; isOwn: boolean }) {
  return (
    <View style={[styles.bubbleWrap, isOwn ? styles.bubbleWrapOwn : styles.bubbleWrapOther]}>
      <SenderLabel name={senderName} senderId={senderId} isOwn={isOwn} />
      <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
        <Text style={styles.messageText}>{content}</Text>
      </View>
    </View>
  );
}

function SystemBubble({ content, meta }: { content: string; meta?: Record<string, unknown> }) {
  const sender = meta?.nudge_from ? String(meta.nudge_from) : null;
  return (
    <View style={styles.systemBubble} accessibilityRole="text" accessibilityLabel={`System message: ${content}`}>
      <Text style={styles.systemText}>
        {sender ? `${sender}: ` : ''}
        {content}
      </Text>
    </View>
  );
}

function AgentBubble({ content }: { content: string }) {
  return (
    <View style={[styles.bubbleWrap, styles.bubbleWrapOther]}>
      <View style={[styles.bubble, styles.agentBubble]} accessibilityRole="text" accessibilityLabel={`Agent response: ${content}`}>
        <View style={styles.agentHeader}>
          <Ionicons name="sparkles" size={14} color={theme.colors.green.primary} />
          <Text style={styles.agentLabel}>Agent</Text>
        </View>
        <Text style={styles.messageText}>{content}</Text>
      </View>
    </View>
  );
}

function MealShareBubble({
  content,
  meta,
  messageId,
  senderName,
  senderId,
  isOwn,
  onFork,
}: {
  content: string;
  meta?: Record<string, unknown>;
  messageId: string;
  senderName?: string | null;
  senderId?: string | null;
  isOwn: boolean;
  onFork?: (id: string) => void;
}) {
  const foodItems = Array.isArray(meta?.food_items) ? (meta.food_items as Record<string, unknown>[]) : [];
  const calories = meta?.total_calories;
  const protein = meta?.total_protein_g ?? 0;
  const carbs = meta?.total_carbs_g ?? 0;
  const fat = meta?.total_fat_g ?? 0;
  const confidence = meta?.confidence ? String(meta.confidence) : null;

  return (
    <View style={[styles.bubbleWrap, isOwn ? styles.bubbleWrapOwn : styles.bubbleWrapOther]}>
      <SenderLabel name={senderName} senderId={senderId} isOwn={isOwn} />
      <View style={[styles.bubble, styles.mealBubble]}>
        <Text style={styles.shareTitle}>🍽 Meal Shared</Text>
        {foodItems.length > 0 && (
          <Text style={styles.foodItems}>
            {foodItems.map((f) => String(f.name ?? '')).filter(Boolean).join(', ')}
          </Text>
        )}
        {calories != null && (
          <Text style={styles.macros}>
            {String(calories)} kcal · {String(protein)}g P · {String(carbs)}g C · {String(fat)}g F
          </Text>
        )}
        {confidence && <Text style={styles.confidence}>Confidence: {confidence}</Text>}
        {content ? <Text style={styles.messageText}>{content}</Text> : null}
        {onFork && (
          <Pressable
            style={({ pressed }) => [styles.forkBtn, pressed && styles.forkBtnPressed]}
            onPress={() => onFork(messageId)}
            accessibilityRole="button"
            accessibilityLabel="Fork ingredients to shopping list"
          >
            <Ionicons name="git-branch-outline" size={14} color={theme.colors.green.primary} />
            <Text style={styles.forkBtnText}>Fork</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function RecipeShareBubble({
  content,
  meta,
  messageId,
  senderName,
  senderId,
  isOwn,
  onFork,
}: {
  content: string;
  meta?: Record<string, unknown>;
  messageId: string;
  senderName?: string | null;
  senderId?: string | null;
  isOwn: boolean;
  onFork?: (id: string) => void;
}) {
  const recipeName = meta?.recipe_name ? String(meta.recipe_name) : null;
  const ingredients = Array.isArray(meta?.ingredients) ? (meta.ingredients as Record<string, unknown>[]) : [];

  return (
    <View style={[styles.bubbleWrap, isOwn ? styles.bubbleWrapOwn : styles.bubbleWrapOther]}>
      <SenderLabel name={senderName} senderId={senderId} isOwn={isOwn} />
      <View style={[styles.bubble, styles.recipeBubble]}>
        <Text style={styles.shareTitle}>📖 Recipe Shared</Text>
        {recipeName && <Text style={styles.recipeName}>{recipeName}</Text>}
        {ingredients.length > 0 && (
          <Text style={styles.foodItems}>
            {ingredients.map((i) => String(i.name ?? '')).filter(Boolean).join(', ')}
          </Text>
        )}
        {content ? <Text style={styles.messageText}>{content}</Text> : null}
        {onFork && (
          <Pressable
            style={({ pressed }) => [styles.forkBtn, pressed && styles.forkBtnPressed]}
            onPress={() => onFork(messageId)}
            accessibilityRole="button"
            accessibilityLabel="Fork recipe ingredients to shopping list"
          >
            <Ionicons name="git-branch-outline" size={14} color={theme.colors.green.primary} />
            <Text style={styles.forkBtnText}>Fork</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  bubbleWrap: { marginBottom: 2 },
  bubbleWrapOwn: { alignItems: 'flex-end' },
  bubbleWrapOther: { alignItems: 'flex-start' },

  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.green.soft,
    marginBottom: 2,
    marginLeft: 4,
  },

  bubble: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '85%',
  },
  bubbleOwn: {
    backgroundColor: theme.colors.green.primary + '22',
  },
  messageText: { fontSize: 14, color: theme.colors.text.primary, lineHeight: 19 },

  /* System / Nudge */
  systemBubble: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 14, marginBottom: 2 },
  systemText: { fontSize: 13, fontWeight: '600', color: theme.colors.text.muted, fontStyle: 'italic' },

  /* Agent */
  agentBubble: {
    backgroundColor: theme.colors.background.elevated,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.green.primary,
  },
  agentHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  agentLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.green.primary },

  /* Meal share */
  mealBubble: { backgroundColor: theme.colors.background.elevated },
  shareTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text.primary, marginBottom: 2 },
  foodItems: { fontSize: 12, color: theme.colors.text.secondary, marginBottom: 2 },
  macros: { fontSize: 11, fontWeight: '600', color: theme.colors.green.soft, marginBottom: 2 },
  confidence: { fontSize: 11, color: theme.colors.text.muted, marginBottom: 4 },

  /* Recipe share */
  recipeBubble: { backgroundColor: theme.colors.background.elevated },
  recipeName: { fontSize: 15, fontWeight: '700', color: theme.colors.green.soft, marginBottom: 4 },

  /* Fork button */
  forkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.green.primary,
  },
  forkBtnPressed: { opacity: 0.7 },
  forkBtnText: { fontSize: 12, fontWeight: '700', color: theme.colors.green.primary },
});
