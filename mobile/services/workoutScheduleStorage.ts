import * as SecureStore from "expo-secure-store";

import type { DayTrainingState, WeeklyTrainingSchedule } from "@/types/workout";

const WORKOUT_SCHEDULE_PREFIX = "itfest_workout_schedule";

const PRESET_CONFIG: Record<"balanced" | "push_pull_legs" | "recovery_first", Record<number, DayTrainingState>> = {
    balanced: {
        0: "gym",
        1: "rest",
        2: "gym",
        3: "rest",
        4: "gym",
        5: "recovery",
        6: "rest",
    },
    push_pull_legs: {
        0: "gym",
        1: "gym",
        2: "rest",
        3: "gym",
        4: "gym",
        5: "recovery",
        6: "rest",
    },
    recovery_first: {
        0: "gym",
        1: "recovery",
        2: "gym",
        3: "rest",
        4: "gym",
        5: "recovery",
        6: "rest",
    },
};

function storageKey(userId: string): string {
    return `${WORKOUT_SCHEDULE_PREFIX}__${userId.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}

function ensureDayStates(dayStates?: Record<number, DayTrainingState>): Record<number, DayTrainingState> {
    const fallback = PRESET_CONFIG.balanced;
    return Array.from({ length: 7 }, (_, day) => day).reduce<Record<number, DayTrainingState>>((acc, day) => {
        const value = dayStates?.[day];
        acc[day] = value === "gym" || value === "rest" || value === "recovery" ? value : fallback[day];
        return acc;
    }, {});
}

function hydrateSchedule(
    userId: string,
    dayStates: Record<number, DayTrainingState>,
    source: "preset" | "manual",
    presetId?: "balanced" | "push_pull_legs" | "recovery_first" | null
): WeeklyTrainingSchedule {
    const gymDays: number[] = [];
    const restDays: number[] = [];
    const recoveryDays: number[] = [];

    for (let day = 0; day < 7; day += 1) {
        const state = dayStates[day];
        if (state === "gym") {
            gymDays.push(day);
        } else if (state === "recovery") {
            recoveryDays.push(day);
        } else {
            restDays.push(day);
        }
    }

    return {
        user_id: userId,
        day_states: dayStates,
        gym_days: gymDays,
        rest_days: restDays,
        recovery_days: recoveryDays,
        source,
        preset_id: presetId ?? null,
        updated_at: new Date().toISOString(),
    };
}

export function createScheduleFromPreset(
    userId: string,
    presetId: "balanced" | "push_pull_legs" | "recovery_first"
): WeeklyTrainingSchedule {
    return hydrateSchedule(userId, ensureDayStates(PRESET_CONFIG[presetId]), "preset", presetId);
}

export function createScheduleFromDayStates(
    userId: string,
    dayStates: Record<number, DayTrainingState>,
    source: "preset" | "manual" = "manual",
    presetId?: "balanced" | "push_pull_legs" | "recovery_first" | null
): WeeklyTrainingSchedule {
    return hydrateSchedule(userId, ensureDayStates(dayStates), source, presetId);
}

export async function loadWorkoutSchedule(userId: string): Promise<WeeklyTrainingSchedule | null> {
    const raw = await SecureStore.getItemAsync(storageKey(userId));
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<WeeklyTrainingSchedule>;
        return createScheduleFromDayStates(
            userId,
            ensureDayStates(parsed.day_states),
            parsed.source === "preset" ? "preset" : "manual",
            parsed.preset_id === "balanced" || parsed.preset_id === "push_pull_legs" || parsed.preset_id === "recovery_first"
                ? parsed.preset_id
                : null
        );
    } catch {
        return null;
    }
}

export async function saveWorkoutSchedule(schedule: WeeklyTrainingSchedule): Promise<void> {
    await SecureStore.setItemAsync(storageKey(schedule.user_id), JSON.stringify(schedule));
}
