/**
 * Squad API — CRUD, membership, shared fridge, fork, and steal.
 */

import api from "./api";

// ── Interfaces ───────────────────────────────────────────────

export interface SquadMember {
  user_id: string;
  display_name: string | null;
  fridge_linked: boolean;
  joined_at: string;
}

export interface Squad {
  id: string;
  name: string;
  created_by: string;
  avg_life_score: number | null;
  avg_life_score_grade: string | null;
  member_count: number;
  created_at: string;
}

export interface SquadDetail extends Squad {
  members: SquadMember[];
}

export interface SharedFridgeItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  expiry_date: string | null;
  expiring_soon: boolean;
  owner_user_id: string;
  owner_display_name: string | null;
}

// ── Squad CRUD ───────────────────────────────────────────────

export async function createSquad(name: string): Promise<Squad> {
  const { data } = await api.post<Squad>("/api/squads", { name });
  return data;
}

export async function listSquads(): Promise<Squad[]> {
  const { data } = await api.get<Squad[]>("/api/squads");
  return data;
}

export async function getSquadDetail(roomId: string): Promise<SquadDetail> {
  const { data } = await api.get<SquadDetail>(`/api/squads/${roomId}`);
  return data;
}

// ── Membership ───────────────────────────────────────────────

export async function addMember(
  roomId: string,
  userId: string
): Promise<void> {
  await api.post(`/api/squads/${roomId}/members`, { user_id: userId });
}

export async function removeMember(
  roomId: string,
  userId: string
): Promise<void> {
  await api.delete(`/api/squads/${roomId}/members/${userId}`);
}

// ── Shared Fridge ────────────────────────────────────────────

export async function optInSharedFridge(roomId: string): Promise<void> {
  await api.post(`/api/squads/${roomId}/shared-fridge/opt-in`);
}

export async function getSharedFridge(
  roomId: string
): Promise<SharedFridgeItem[]> {
  const { data } = await api.get<SharedFridgeItem[]>(
    `/api/squads/${roomId}/shared-fridge`
  );
  return data;
}

export async function generateSharedShoppingList(
  roomId: string
): Promise<Record<string, unknown>[]> {
  const { data } = await api.post<Record<string, unknown>[]>(
    `/api/squads/${roomId}/shared-fridge/shopping-list`
  );
  return data;
}

// ── Fork & Steal ─────────────────────────────────────────────

export async function forkMessage(
  roomId: string,
  messageId: string
): Promise<Record<string, unknown>[]> {
  const { data } = await api.post<Record<string, unknown>[]>(
    `/api/squads/${roomId}/fork/${messageId}`
  );
  return data;
}

export async function stealWorkout(
  friendId: string
): Promise<Record<string, unknown>> {
  const { data } = await api.post<Record<string, unknown>>(
    `/api/squads/steal-workout/${friendId}`
  );
  return data;
}

export async function stealRecipes(
  friendId: string
): Promise<Record<string, unknown>[]> {
  const { data } = await api.post<Record<string, unknown>[]>(
    `/api/squads/steal-recipes/${friendId}`
  );
  return data;
}
