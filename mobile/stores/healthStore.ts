import { create } from 'zustand';
import { HealthExportUploadResponse, getHealthData } from '@/services/healthExportApi';

const LAST_7_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function filterByLast7Days<T extends { timestamp: string }>(entries: T[]): T[] {
  const cutoff = Date.now() - LAST_7_DAYS_MS;
  return entries.filter((entry) => {
    const timestamp = new Date(entry.timestamp).getTime();
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });
}

export function normalizeHealthDataToLast7Days(
  data: HealthExportUploadResponse | null,
): HealthExportUploadResponse | null {
  if (!data || !data.raw_series) {
    return data;
  }

  const filteredRawSeries = {
    heart_rates: filterByLast7Days(data.raw_series.heart_rates ?? []),
    steps: filterByLast7Days(data.raw_series.steps ?? []),
    sleep_hours: filterByLast7Days(data.raw_series.sleep_hours ?? []),
    active_energy: filterByLast7Days(data.raw_series.active_energy ?? []),
    hrv: filterByLast7Days(data.raw_series.hrv ?? []),
  };

  const summarize = (entries: Array<{ value: number }>, unit: string) => {
    const sampleCount = entries.length;
    const total = entries.reduce((sum, entry) => sum + entry.value, 0);
    const average = sampleCount > 0 ? total / sampleCount : 0;

    return {
      sample_count: sampleCount,
      total,
      average,
      unit,
    };
  };

  return {
    ...data,
    parsed_metrics: {
      heart_rate: summarize(filteredRawSeries.heart_rates, data.parsed_metrics.heart_rate.unit),
      step_count: summarize(filteredRawSeries.steps, data.parsed_metrics.step_count.unit),
      sleep_analysis: summarize(filteredRawSeries.sleep_hours, data.parsed_metrics.sleep_analysis.unit),
      active_energy_burned: summarize(filteredRawSeries.active_energy, data.parsed_metrics.active_energy_burned.unit),
      hrv_sdnn: summarize(filteredRawSeries.hrv, data.parsed_metrics.hrv_sdnn.unit),
    },
    raw_series: {
      ...filteredRawSeries,
    },
  };
}

interface HealthStore {
  healthData: HealthExportUploadResponse | null;
  isLoading: boolean;
  isInitialized: boolean;
  setHealthData: (data: HealthExportUploadResponse) => void;
  clearHealthData: () => void;
  loadHealthData: () => Promise<void>;
}

export const useHealthStore = create<HealthStore>((set) => ({
  healthData: null,
  isLoading: false,
  isInitialized: false,

  setHealthData: (data) => set({ healthData: normalizeHealthDataToLast7Days(data) }),

  clearHealthData: () => set({ healthData: null }),

  loadHealthData: async () => {
    set({ isLoading: true });
    try {
      const data = await getHealthData();
      set({ healthData: normalizeHealthDataToLast7Days(data), isLoading: false, isInitialized: true });
    } catch (error) {
      console.error('Error loading health data:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },
}));
