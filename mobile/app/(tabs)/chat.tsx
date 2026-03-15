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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore, type ChatMessage } from '@/stores/chatStore';
import { theme } from '@/constants/theme';

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{message.content}</Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const {
    sessions, activeSessionLocalId, messages, streaming, error,
    hydrateSessions, createSession, selectSession, deleteSession, sendMessage,
  } = useChatStore();
  const [input, setInput] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  React.useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    sendMessage(text);
  };

  React.useEffect(() => { hydrateSessions(); }, [hydrateSessions]);

  const handleDeleteSession = (localId: string) => {
    if (!sessions.some((s) => s.localId === localId)) return;
    if (sessions.length <= 1) { Alert.alert('Cannot delete', 'Keep at least one chat session.'); return; }
    Alert.alert('Delete session', 'Remove this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { try { deleteSession(localId); } catch { Alert.alert('Delete failed', 'Please try again.'); } } },
    ]);
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Chat</Text>
          <Text style={styles.headerSubtitle}>Ask anything about nutrition</Text>
        </View>
        <TouchableOpacity onPress={createSession} accessibilityRole="button" accessibilityLabel="New chat session">
          <View style={styles.addBtn}><Ionicons name="add" size={20} color={theme.colors.green.primary} /></View>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal style={styles.sessionScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessionRow}>
        {sessions.map((session) => {
          const isActive = session.localId === activeSessionLocalId;
          return (
            <TouchableOpacity key={session.localId} style={[styles.sessionChip, isActive && styles.sessionChipActive]} onPress={() => selectSession(session.localId)}>
              <Text style={[styles.sessionChipText, isActive && styles.sessionChipTextActive]} numberOfLines={1}>{session.title}</Text>
              {sessions.length > 1 && (
                <TouchableOpacity onPress={() => handleDeleteSession(session.localId)} hitSlop={8}>
                  <Ionicons name="close" size={14} color={isActive ? theme.colors.text.primary : theme.colors.text.muted} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={48} color={theme.colors.green.primary} /></View>
            <Text style={styles.emptyTitle}>Nutrition Assistant</Text>
            <Text style={styles.emptyBody}>Ask about meal ideas, log your food, get workout recommendations, or seek diet advice.</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef} style={{ flex: 1 }} data={messages}
            keyExtractor={(_, i) => String(i)} renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={styles.messageList} keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={[styles.composerWrap, { paddingBottom: isKeyboardVisible ? 12 : 90 }]}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput} value={input} onChangeText={setInput}
              placeholder="Type a message…" placeholderTextColor={theme.colors.text.muted}
              multiline maxLength={1000} editable={!streaming}
              onSubmitEditing={handleSend} blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || streaming) && styles.sendBtnDisabled]}
              onPress={handleSend} disabled={!input.trim() || streaming}
              accessibilityRole="button" accessibilityLabel="Send message"
            >
              {streaming ? <ActivityIndicator color={theme.colors.background.main} size="small" /> : <Ionicons name="send" size={18} color={theme.colors.background.main} />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}


const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background.main },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text.primary },
  headerSubtitle: { marginTop: 2, fontSize: 12, color: theme.colors.text.muted, fontWeight: '500' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(57,255,136,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  sessionScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: theme.colors.ui.divider, paddingBottom: 4 },
  sessionRow: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', gap: 10 },
  sessionChip: {
    maxWidth: 160, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.background.secondary, borderRadius: theme.radius.sm,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  sessionChipActive: { backgroundColor: 'rgba(57,255,136,0.1)' },
  sessionChipText: { color: theme.colors.text.muted, fontSize: 13, fontWeight: '600', maxWidth: 120 },
  sessionChipTextActive: { color: theme.colors.green.primary },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(57,255,136,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text.primary },
  emptyBody: { fontSize: 14, color: theme.colors.text.muted, textAlign: 'center', lineHeight: 20 },
  messageList: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 8 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '85%', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 },
  bubbleAssistant: { backgroundColor: theme.colors.background.secondary, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: theme.colors.green.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 16, lineHeight: 24, color: theme.colors.text.secondary },
  bubbleTextUser: { color: theme.colors.background.main, fontWeight: '500' },
  errorText: {
    fontSize: 13, color: theme.colors.error, paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: 'rgba(255,82,82,0.08)', textAlign: 'center',
  },
  composerWrap: { borderTopWidth: 1, borderTopColor: theme.colors.ui.divider, backgroundColor: theme.colors.background.secondary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, minHeight: 68, gap: 12 },
  textInput: {
    flex: 1, backgroundColor: theme.colors.background.main, borderRadius: 22,
    borderWidth: 1, borderColor: theme.colors.ui.divider,
    paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 14 : 12, paddingBottom: Platform.OS === 'ios' ? 14 : 12,
    color: theme.colors.text.primary, fontSize: 16, minHeight: 44, maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.colors.green.primary, alignItems: 'center', justifyContent: 'center',
    ...theme.glow.subtle,
  },
  sendBtnDisabled: { opacity: 0.4, backgroundColor: theme.colors.background.elevated, shadowOpacity: 0, elevation: 0 },
});
