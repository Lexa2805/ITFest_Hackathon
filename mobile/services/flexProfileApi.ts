/**
 * Flex Profile API — fetch a friend's interactive profile.
 */

import api from "./api";

// ── Interfaces ───────────────────────────────────────────────

export interface FlexProfile {
  user_id: string;
  display_name: string | null;
  life_score: string | null;
  life_score_summary: string | null;
  streaks: Record<string, unknown> | null;
  badges: string[];
  active_workout_split: string | null;
  current_recipe_plan: string | null;
  can_steal_workout: boolean;
  can_steal_recipes: boolean;
}

// ── API ──────────────────────────────────────────────────────

export async function getFlexProfile(userId: string): Promise<FlexProfile> {
  const { data } = await api.get<FlexProfile>(
    `/api/flex-profile/${userId}`
  );
  return data;
}
