import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore, type ChatMessage } from '@/stores/chatStore';

const C = {
  background: '#0A0A0A',
  card: '#141414',
  border: '#1E1E1E',
  title: '#F5F5F5',
  body: '#C8D1CC',
  muted: '#93A19A',
  accent: '#00E676',
  accentSoft: 'rgba(0,230,118,0.15)',
  userBubble: '#1A2E1F',
} as const;

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const {
    sessions,
    activeSessionLocalId,
    messages,
    streaming,
    error,
    hydrateSessions,
    createSession,
    selectSession,
    deleteSession,
    sendMessage,
  } = useChatStore();
  const [input, setInput] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    sendMessage(text);
  };

  React.useEffect(() => {
    hydrateSessions();
  }, [hydrateSessions]);

  const handleDeleteSession = (localId: string) => {
    const targetExists = sessions.some((session) => session.localId === localId);
    if (!targetExists) {
      return;
    }

    if (sessions.length <= 1) {
      Alert.alert('Cannot delete', 'Keep at least one chat session.');
      return;
    }

    Alert.alert('Delete session', 'Remove this conversation from saved sessions?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          try {
            deleteSession(localId);
          } catch {
            Alert.alert('Delete failed', 'Please try again.');
          }
        }
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Chat</Text>
          <Text style={styles.headerSubtitle}>Ask anything about nutrition</Text>
        </View>
        <TouchableOpacity onPress={createSession} accessibilityRole="button" accessibilityLabel="New chat session">
          <Ionicons name="add" size={24} color={C.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        style={styles.sessionScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sessionRow}
      >
        {sessions.map((session) => {
          const isActive = session.localId === activeSessionLocalId;

          return (
            <TouchableOpacity
              key={session.localId}
              style={[styles.sessionChip, isActive && styles.sessionChipActive]}
              onPress={() => selectSession(session.localId)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${session.title}`}
            >
              <Text style={[styles.sessionChipText, isActive && styles.sessionChipTextActive]} numberOfLines={1}>
                {session.title}
              </Text>
              {sessions.length > 1 && (
                <TouchableOpacity onPress={() => handleDeleteSession(session.localId)} hitSlop={8}>
                  <Ionicons
                    name="close"
                    size={14}
                    color={isActive ? C.title : C.muted}
                  />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={56} color={C.accent} style={{ opacity: 0.8, marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>Nutrition Assistant</Text>
            <Text style={styles.emptyBody}>
              Ask about meal ideas, log your food, get compensatory workout recommendations, or seek diet advice!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            style={{ flex: 1 }}
            data={messages}
            keyExtractor={(_, index) => String(index)}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={[styles.composerWrap, { paddingBottom: isKeyboardVisible ? (Platform.OS === 'ios' ? 12 : 12) : 90 }]}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message…"
              placeholderTextColor={C.muted}
              multiline
              maxLength={1000}
              editable={!streaming}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || streaming) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || streaming}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              {streaming ? (
                <ActivityIndicator color={C.background} size="small" />
              ) : (
                <Ionicons name="send" size={20} color={C.background} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.title,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: C.muted,
    fontWeight: '500',
  },
  sessionScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: '#0F0F0F',
    paddingBottom: 4,
  },
  sessionRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 12,
  },
  sessionChip: {
    maxWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionChipActive: {
    borderColor: C.accent,
    backgroundColor: '#112211',
  },
  sessionChipText: {
    color: C.muted,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 120,
  },
  sessionChipTextActive: {
    color: C.accent,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.title,
  },
  emptyBody: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  bubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  bubbleAssistant: {
    backgroundColor: '#1E1E1E',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: C.accent,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#E0E0E0',
  },
  bubbleTextUser: {
    color: '#000000',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 13,
    color: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    textAlign: 'center',
  },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: '#141414',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 68,
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 14 : 12,
    paddingBottom: Platform.OS === 'ios' ? 14 : 12,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 44,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendBtnDisabled: {
    opacity: 0.5,
    backgroundColor: '#333333',
    shadowOpacity: 0,
    elevation: 0,
  },
});
