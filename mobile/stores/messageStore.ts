/**
 * Zustand store for squad messaging + Supabase Realtime subscriptions.
 * The Supabase client here is used ONLY for Realtime event subscriptions —
 * all reads/writes go through the Axios-backed messageApi.
 */

import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseRealtime } from "@/services/supabaseRealtime";
import {
  getMessageHistory,
  sendMessage as apiSendMessage,
  sendNudge as apiSendNudge,
  sendMealShare as apiSendMealShare,
  type Message,
  type SendMessagePayload,
  type NudgePayload,
  type MealSharePayload,
} from "@/services/messageApi";

interface MessageState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  _channel: RealtimeChannel | null;

  fetchHistory: (roomId: string, limit?: number) => Promise<void>;
  sendMessage: (payload: SendMessagePayload) => Promise<Message>;
  sendNudge: (payload: NudgePayload) => Promise<Message>;
  sendMealShare: (payload: MealSharePayload) => Promise<Message>;
  subscribeToRoom: (roomId: string) => void;
  unsubscribeFromRoom: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  _channel: null,

  fetchHistory: async (roomId, limit = 50) => {
    set({ isLoading: true, error: null });
    try {
      const messages = await getMessageHistory(roomId, limit);
      set({ messages, isLoading: false });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to load messages.";
      set({ error: msg, isLoading: false });
    }
  },

  sendMessage: async (payload) => {
    set({ error: null });
    try {
      const message = await apiSendMessage(payload);
      // Append optimistically; deduplicate guard in Realtime handler prevents doubles
      set((s) => {
        if (s.messages.some((m) => m.id === message.id)) return s;
        return { messages: [...s.messages, message] };
      });
      return message;
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to send message.";
      set({ error: msg });
      throw err;
    }
  },

  sendNudge: async (payload) => {
    set({ error: null });
    try {
      const message = await apiSendNudge(payload);
      return message;
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to send nudge.";
      set({ error: msg });
      throw err;
    }
  },

  sendMealShare: async (payload) => {
    set({ error: null });
    try {
      const message = await apiSendMealShare(payload);
      return message;
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to share meal.";
      set({ error: msg });
      throw err;
    }
  },

  subscribeToRoom: (roomId) => {
    // Tear down any existing subscription first
    const existing = get()._channel;
    if (existing) {
      supabaseRealtime.removeChannel(existing);
    }

    const channel = supabaseRealtime
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_room_id=eq.${roomId}`,
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          const newId = newRow.id as string;

          // If this message already exists (optimistic send), skip
          if (get().messages.some((m) => m.id === newId)) return;

          // Re-fetch full history so messages include sender_display_name
          // (the raw Realtime row doesn't have it — it's computed server-side)
          get().fetchHistory(roomId);
        }
      )
      .subscribe();

    set({ _channel: channel });
  },

  unsubscribeFromRoom: () => {
    const channel = get()._channel;
    if (channel) {
      supabaseRealtime.removeChannel(channel);
      set({ _channel: null });
    }
  },
}));
