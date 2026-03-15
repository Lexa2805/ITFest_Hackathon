/**
 * SquadChatScreen — realtime messaging with @Agent mention support.
 * Subscribes to Supabase Realtime on mount, unsubscribes on unmount.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useSquadStore } from '@/stores/squadStore';
import { useMessageStore } from '@/stores/messageStore';
import { MessageBubble } from '@/components/squad/MessageBubble';
import { theme } from '@/constants/theme';
import type { Message } from '@/services/messageApi';

export default function SquadChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const roomId = id ?? '';

  const { activeSquad, fetchSquadDetail, forkMessage } = useSquadStore();
  const {
    messages,
    isLoading,
    fetchHistory,
    sendMessage,
    subscribeToRoom,
    unsubscribeFromRoom,
  } = useMessageStore();

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (!roomId) return;
    fetchSquadDetail(roomId);
    fetchHistory(roomId);
    subscribeToRoom(roomId);
    return () => unsubscribeFromRoom();
  }, [roomId]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await sendMessage({ chat_room_id: roomId, content: trimmed });
      setText('');
    } catch {
      // error is set in store
    } finally {
      setSending(false);
    }
  }, [text, roomId, sending, sendMessage]);

  const insertAgentMention = useCallback(() => {
    setText((prev) => {
      const prefix = prev.endsWith(' ') || prev === '' ? '' : ' ';
      return `${prev}${prefix}@Agent `;
    });
  }, []);

  const handleFork = useCallback(
    async (messageId: string) => {
      try {
        await forkMessage(roomId, messageId);
        Alert.alert('Forked', 'Ingredients added to your shopping list');
      } catch {
        // error is set in store
      }
    },
    [roomId, forkMessage],
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble message={item} onFork={handleFork} />
    ),
    [handleFork],
  );

  const squadName = activeSquad?.name ?? 'Squad';
  const gradeLabel = activeSquad?.avg_life_score_grade
    ? ` · ${activeSquad.avg_life_score_grade}`
    : '';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: squadName,
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerTintColor: theme.colors.text.primary,
          headerRight: () =>
            activeSquad?.avg_life_score_grade ? (
              <View style={styles.headerGrade}>
                <Text style={styles.headerGradeText}>
                  {activeSquad.avg_life_score_grade}
                </Text>
              </View>
            ) : null,
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading && messages.length === 0 ? (
          <ActivityIndicator
            size="large"
            color={theme.colors.green.primary}
            style={styles.loader}
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptyHint}>Say something to your squad</Text>
              </View>
            }
          />
        )}

        {/* Composer */}
        <View style={styles.composer}>
          <Pressable
            onPress={insertAgentMention}
            style={styles.agentBtn}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Mention AI Agent"
          >
            <Ionicons name="sparkles-outline" size={20} color={theme.colors.green.primary} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Message…"
            placeholderTextColor={theme.colors.text.muted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            returnKeyType="default"
            accessibilityLabel="Message input"
          />
          <Pressable
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {sending ? (
              <ActivityIndicator size="small" color={theme.colors.background.main} />
            ) : (
              <Ionicons name="send" size={18} color={theme.colors.background.main} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background.main },
  flex: { flex: 1 },
  header: { backgroundColor: theme.colors.background.main },
  headerTitle: { color: theme.colors.text.primary, fontWeight: '700', fontSize: 17 },
  headerGrade: {
    backgroundColor: 'rgba(57,255,136,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    marginRight: 8,
  },
  headerGradeText: { fontSize: 13, fontWeight: '800', color: theme.colors.green.primary },
  loader: { marginTop: 60 },

  /* Messages */
  messageList: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8, gap: 8 },

  /* Empty */
  empty: { alignItems: 'center', marginTop: 80, gap: 6 },
  emptyText: { fontSize: 16, fontWeight: '700', color: theme.colors.text.secondary },
  emptyHint: { fontSize: 13, color: theme.colors.text.muted },

  /* Composer */
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ui.divider,
    backgroundColor: theme.colors.background.main,
  },
  agentBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(57,255,136,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.green.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
