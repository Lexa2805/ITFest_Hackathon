import api from './api';

export interface MetricsSnapshot {
  avg_heart_rate_bpm: number;
  avg_daily_steps: number;
  avg_nightly_sleep_hours: number;
  avg_hrv_sdnn_ms: number;
  avg_daily_active_energy_kcal: number;
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: string;
  bmi: number;
}

export interface LifeScoreResponse {
  id: string;
  score: string;
  summary: string;
  top_strengths: string[];
  areas_for_improvement: string[];
  metrics_snapshot: MetricsSnapshot;
  created_at: string;
}

export async function generateLifeScore(): Promise<LifeScoreResponse> {
  const { data } = await api.post<LifeScoreResponse>(
    '/api/health/life-score/generate',
    {},
    { timeout: 60_000 },
  );
  return data;
}

export async function getLatestLifeScore(): Promise<LifeScoreResponse | null> {
  try {
    const { data } = await api.get<LifeScoreResponse>('/api/health/life-score');
    return data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}
