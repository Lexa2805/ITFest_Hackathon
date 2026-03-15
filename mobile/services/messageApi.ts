/**
 * Message API — send messages, nudges, meal shares, and fetch history.
 */

import api from "./api";

// ── Interfaces ───────────────────────────────────────────────

export interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string | null;
  sender_display_name: string | null;
  content: string;
  message_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SendMessagePayload {
  chat_room_id: string;
  content: string;
  message_type?: "text" | "meal_share" | "recipe_share";
  metadata?: Record<string, unknown>;
}

export interface NudgePayload {
  friend_user_id: string;
  template:
    | "Time for the gym!"
    | "Have you logged your meals today?"
    | "Let's hit our goals today!";
}

export interface MealSharePayload {
  chat_room_id: string;
  food_items: Record<string, unknown>[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  confidence: string;
  image_ref?: string;
}

// ── API calls ────────────────────────────────────────────────

export async function sendMessage(payload: SendMessagePayload): Promise<Message> {
  const { data } = await api.post<Message>("/api/messages/send", payload);
  return data;
}

export async function getMessageHistory(
  roomId: string,
  limit = 50
): Promise<Message[]> {
  const { data } = await api.get<Message[]>(`/api/messages/${roomId}`, {
    params: { limit },
  });
  return data;
}

export async function sendNudge(payload: NudgePayload): Promise<Message> {
  const { data } = await api.post<Message>("/api/messages/nudge", payload);
  return data;
}

export async function sendMealShare(payload: MealSharePayload): Promise<Message> {
  const { data } = await api.post<Message>("/api/messages/meal-share", payload);
  return data;
}
