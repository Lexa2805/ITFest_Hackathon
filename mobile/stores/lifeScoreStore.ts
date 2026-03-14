import { create } from 'zustand';
import {
  LifeScoreResponse,
  getLatestLifeScore,
  generateLifeScore as apiGenerateLifeScore,
} from '@/services/lifeScoreApi';

interface LifeScoreStore {
  lifeScore: LifeScoreResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchLifeScore: () => Promise<void>;
  generateLifeScore: () => Promise<void>;
}

export const useLifeScoreStore = create<LifeScoreStore>((set) => ({
  lifeScore: null,
  isLoading: false,
  error: null,

  fetchLifeScore: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getLatestLifeScore();
      set({ lifeScore: data, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching life score:', error);
      set({ isLoading: false, error: error?.message ?? 'Failed to load Life Score' });
    }
  },

  generateLifeScore: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiGenerateLifeScore();
      set({ lifeScore: data, isLoading: false });
    } catch (error: any) {
      const status = error?.response?.status;
      let message = 'Failed to generate Life Score';
      if (status === 429) {
        message = error?.response?.data?.detail ?? 'Please upload new health data or wait before recalculating.';
      } else if (status === 502) {
        message = 'AI service is temporarily unavailable. Please try again later.';
      }
      console.error('Error generating life score:', error);
      set({ isLoading: false, error: message });
    }
  },
}));
