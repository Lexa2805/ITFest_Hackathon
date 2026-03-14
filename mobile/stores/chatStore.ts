/**
 * Zustand store for the Conversational Nutrition Agent chat.
 */

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { streamChatMessage } from "@/services/chatApi";
import { useAuthStore } from "@/stores/authStore";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSession {
  localId: string;
  title: string;
  messages: ChatMessage[];
  sessionId: string | null;
  updatedAt: string;
}

interface PersistedChatState {
  sessions: ChatSession[];
  activeSessionLocalId: string | null;
}

const STORAGE_PREFIX = "nutrition_chat_sessions_v1";
const SECURESTORE_KEY_INVALID_CHARS = /[^A-Za-z0-9._-]/g;

function makeLocalId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeSessionTitle(messages: ChatMessage[], fallbackIndex?: number): string {
  const firstUserMessage = messages.find((message) => message.role === "user")?.content?.trim();
  if (firstUserMessage) {
    return firstUserMessage.length > 24 ? `${firstUserMessage.slice(0, 24)}…` : firstUserMessage;
  }
  return fallbackIndex ? `Session ${fallbackIndex}` : "New session";
}

function createEmptySession(index?: number): ChatSession {
  return {
    localId: makeLocalId(),
    title: index ? `Session ${index}` : "New session",
    messages: [],
    sessionId: null,
    updatedAt: new Date().toISOString(),
  };
}

function sanitizeSecureStoreKeyPart(value: string): string {
  const sanitized = value.replace(SECURESTORE_KEY_INVALID_CHARS, "_");
  return sanitized.length > 0 ? sanitized : "guest";
}

function storageKey(): string {
  const userId = useAuthStore.getState().user?.id ?? "guest";
  return `${STORAGE_PREFIX}__${sanitizeSecureStoreKeyPart(userId)}`;
}

async function persistState(sessions: ChatSession[], activeSessionLocalId: string | null): Promise<void> {
  try {
    const payload: PersistedChatState = { sessions, activeSessionLocalId };
    await SecureStore.setItemAsync(storageKey(), JSON.stringify(payload));
  } catch (error) {
    console.warn("[chatStore] Failed to persist chat state", error);
  }
}

function syncFromActiveSession(state: ChatState): Pick<ChatState, "messages" | "sessionId"> {
  const activeSession = state.sessions.find((session) => session.localId === state.activeSessionLocalId) ?? state.sessions[0];
  return {
    messages: activeSession?.messages ?? [],
    sessionId: activeSession?.sessionId ?? null,
  };
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionLocalId: string | null;
  messages: ChatMessage[];
  sessionId: string | null;
  streaming: boolean;
  error: string | null;

  hydrateSessions: () => Promise<void>;
  createSession: () => void;
  selectSession: (localId: string) => void;
  deleteSession: (localId: string) => void;
  sendMessage: (text: string) => Promise<void>;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [createEmptySession(1)],
  activeSessionLocalId: null,
  messages: [],
  sessionId: null,
  streaming: false,
  error: null,

  hydrateSessions: async () => {
    try {
      const raw = await SecureStore.getItemAsync(storageKey());
      if (!raw) {
        const initialSession = createEmptySession(1);
        const initialState = {
          sessions: [initialSession],
          activeSessionLocalId: initialSession.localId,
        };
        set({
          ...initialState,
          ...syncFromActiveSession({
            ...get(),
            ...initialState,
          } as ChatState),
        });
        return;
      }

      const parsed = JSON.parse(raw) as PersistedChatState;
      const sessions = Array.isArray(parsed.sessions) && parsed.sessions.length > 0
        ? parsed.sessions
        : [createEmptySession(1)];
      const activeSessionLocalId = sessions.some((session) => session.localId === parsed.activeSessionLocalId)
        ? parsed.activeSessionLocalId
        : sessions[0].localId;

      const nextState = {
        sessions,
        activeSessionLocalId,
      };

      set({
        ...nextState,
        ...syncFromActiveSession({
          ...get(),
          ...nextState,
        } as ChatState),
        error: null,
      });
    } catch {
      const fallbackSession = createEmptySession(1);
      set({
        sessions: [fallbackSession],
        activeSessionLocalId: fallbackSession.localId,
        messages: [],
        sessionId: null,
      });
    }
  },

  createSession: () => {
    const { sessions } = get();
    const newSession = createEmptySession(sessions.length + 1);
    const nextSessions = [newSession, ...sessions];
    const nextState = {
      sessions: nextSessions,
      activeSessionLocalId: newSession.localId,
      messages: [],
      sessionId: null,
      error: null,
      streaming: false,
    };
    set(nextState);
    void persistState(nextSessions, newSession.localId);
  },

  selectSession: (localId: string) => {
    const { sessions } = get();
    const selected = sessions.find((session) => session.localId === localId);
    if (!selected) return;

    const nextState = {
      activeSessionLocalId: selected.localId,
      messages: selected.messages,
      sessionId: selected.sessionId,
      error: null,
    };
    set(nextState);
    void persistState(sessions, selected.localId);
  },

  deleteSession: (localId: string) => {
    const { sessions, activeSessionLocalId } = get();
    const filtered = sessions.filter((session) => session.localId !== localId);
    const nextSessions = filtered.length > 0 ? filtered : [createEmptySession(1)];
    const nextActive = nextSessions.some((session) => session.localId === activeSessionLocalId)
      ? activeSessionLocalId
      : nextSessions[0].localId;
    const active = nextSessions.find((session) => session.localId === nextActive) ?? nextSessions[0];

    set({
      sessions: nextSessions,
      activeSessionLocalId: active.localId,
      messages: active.messages,
      sessionId: active.sessionId,
      error: null,
      streaming: false,
    });

    void persistState(nextSessions, active.localId);
  },

  sendMessage: async (text: string) => {
    const { activeSessionLocalId, sessions } = get();

    const activeSession = sessions.find((session) => session.localId === activeSessionLocalId) ?? sessions[0];
    if (!activeSession) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: text };
    const appendedMessages = [...activeSession.messages, userMessage];
    const nextTitle = makeSessionTitle(appendedMessages, sessions.length);

    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.localId === activeSession.localId
          ? {
            ...session,
            title: nextTitle,
            messages: appendedMessages,
            updatedAt: new Date().toISOString(),
          }
          : session
      ),
      messages: appendedMessages,
      sessionId: activeSession.sessionId,
      streaming: true,
      error: null,
    }));

    let assistantContent = "";
    let resolvedSessionId = activeSession.sessionId;

    try {
      const stream = streamChatMessage(activeSession.sessionId, text);

      for await (const chunk of stream) {
        assistantContent += chunk.token;
        if (!resolvedSessionId) resolvedSessionId = chunk.session_id;

        set((state) => {
          const msgs = [...state.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = { role: "assistant", content: assistantContent };
          } else {
            msgs.push({ role: "assistant", content: assistantContent });
          }

          const nextSessions = state.sessions.map((session) =>
            session.localId === state.activeSessionLocalId
              ? {
                ...session,
                title: makeSessionTitle(msgs),
                messages: msgs,
                sessionId: resolvedSessionId,
                updatedAt: new Date().toISOString(),
              }
              : session
          );

          return {
            messages: msgs,
            sessionId: resolvedSessionId,
            sessions: nextSessions,
          };
        });
      }

      const { sessions: finalSessions, activeSessionLocalId: finalActive } = get();
      set({ streaming: false });
      void persistState(finalSessions, finalActive);
    } catch (err: any) {
      const msg =
        err?.message || "The nutrition agent is temporarily unavailable.";
      set({ error: msg, streaming: false });
      const { sessions: finalSessions, activeSessionLocalId: finalActive } = get();
      void persistState(finalSessions, finalActive);
    }
  },

  resetChat: () => {
    const { createSession } = get();
    createSession();
  },
}));
