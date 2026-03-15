/**
 * Zustand store for the Squads system.
 * Wraps squadApi with loading/error state management.
 */

import { create } from "zustand";
import {
  listSquads,
  discoverSquads as apiDiscoverSquads,
  joinSquad as apiJoinSquad,
  createSquad as apiCreateSquad,
  getSquadDetail,
  addMember as apiAddMember,
  removeMember as apiRemoveMember,
  optInSharedFridge as apiOptIn,
  getSharedFridge as apiGetSharedFridge,
  generateSharedShoppingList as apiGenShoppingList,
  forkMessage as apiForkMessage,
  stealWorkout as apiStealWorkout,
  stealRecipes as apiStealRecipes,
  type Squad,
  type SquadDetail,
  type SharedFridgeItem,
} from "@/services/squadApi";

interface SquadState {
  squads: Squad[];
  discoverSquads: Squad[];
  activeSquad: SquadDetail | null;
  sharedFridge: SharedFridgeItem[];
  isLoading: boolean;
  error: string | null;

  fetchSquads: () => Promise<void>;
  fetchDiscoverSquads: () => Promise<void>;
  joinSquad: (roomId: string) => Promise<Squad>;
  createSquad: (name: string) => Promise<Squad>;
  fetchSquadDetail: (roomId: string) => Promise<void>;
  addMember: (roomId: string, userId: string) => Promise<void>;
  removeMember: (roomId: string, userId: string) => Promise<void>;
  optInSharedFridge: (roomId: string) => Promise<void>;
  fetchSharedFridge: (roomId: string) => Promise<void>;
  generateSharedShoppingList: (roomId: string) => Promise<Record<string, unknown>[]>;
  forkMessage: (roomId: string, messageId: string) => Promise<Record<string, unknown>[]>;
  stealWorkout: (friendId: string) => Promise<Record<string, unknown>>;
  stealRecipes: (friendId: string) => Promise<Record<string, unknown>[]>;
}

export const useSquadStore = create<SquadState>((set, get) => ({
  squads: [],
  discoverSquads: [],
  activeSquad: null,
  sharedFridge: [],
  isLoading: false,
  error: null,

  fetchSquads: async () => {
    set({ isLoading: true, error: null });
    try {
      const squads = await listSquads();
      set({ squads, isLoading: false });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to load squads.";
      set({ error: msg, isLoading: false });
    }
  },

  fetchDiscoverSquads: async () => {
    set({ isLoading: true, error: null });
    try {
      const squads = await apiDiscoverSquads();
      set({ discoverSquads: squads, isLoading: false });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to discover squads.";
      set({ error: msg, isLoading: false });
    }
  },

  joinSquad: async (roomId) => {
    set({ isLoading: true, error: null });
    try {
      const squad = await apiJoinSquad(roomId);
      set((s) => ({
        squads: [squad, ...s.squads],
        discoverSquads: s.discoverSquads.map((sq) =>
          sq.id === roomId ? { ...sq, member_count: sq.member_count + 1 } : sq
        ),
        isLoading: false,
      }));
      return squad;
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to join squad.";
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  createSquad: async (name) => {
    set({ isLoading: true, error: null });
    try {
      const squad = await apiCreateSquad(name);
      set((s) => ({ squads: [squad, ...s.squads], isLoading: false }));
      return squad;
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to create squad.";
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  fetchSquadDetail: async (roomId) => {
    set({ isLoading: true, error: null });
    try {
      const detail = await getSquadDetail(roomId);
      set({ activeSquad: detail, isLoading: false });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to load squad detail.";
      set({ error: msg, isLoading: false });
    }
  },

  addMember: async (roomId, userId) => {
    set({ isLoading: true, error: null });
    try {
      await apiAddMember(roomId, userId);
      // Refresh detail to reflect new member
      const detail = await getSquadDetail(roomId);
      set({ activeSquad: detail, isLoading: false });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to add member.";
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  removeMember: async (roomId, userId) => {
    set({ isLoading: true, error: null });
    try {
      await apiRemoveMember(roomId, userId);
      const detail = await getSquadDetail(roomId);
      set({ activeSquad: detail, isLoading: false });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to remove member.";
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  optInSharedFridge: async (roomId) => {
    set({ isLoading: true, error: null });
    try {
      await apiOptIn(roomId);
      // Refresh detail to reflect fridge_linked change
      const detail = await getSquadDetail(roomId);
      set({ activeSquad: detail, isLoading: false });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to opt into shared fridge.";
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  fetchSharedFridge: async (roomId) => {
    set({ isLoading: true, error: null });
    try {
      const items = await apiGetSharedFridge(roomId);
      set({ sharedFridge: items, isLoading: false });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to load shared fridge.";
      set({ error: msg, isLoading: false });
    }
  },

  generateSharedShoppingList: async (roomId) => {
    set({ isLoading: true, error: null });
    try {
      const list = await apiGenShoppingList(roomId);
      set({ isLoading: false });
      return list;
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to generate shopping list.";
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  forkMessage: async (roomId, messageId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiForkMessage(roomId, messageId);
      set({ isLoading: false });
      return result;
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to fork message.";
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  stealWorkout: async (friendId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiStealWorkout(friendId);
      set({ isLoading: false });
      return result;
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to steal workout.";
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  stealRecipes: async (friendId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiStealRecipes(friendId);
      set({ isLoading: false });
      return result;
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to steal recipes.";
      set({ error: msg, isLoading: false });
      throw err;
    }
  },
}));
