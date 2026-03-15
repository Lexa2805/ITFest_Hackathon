import type { ProfileResponse } from "@/services/profileApi";
import type { DayTrainingState, SplitType, WorkoutPlanRecommendation } from "@/types/workout";

function countGymDays(dayStates?: Record<number, DayTrainingState> | null): number | null {
    if (!dayStates) {
        return null;
    }

    return Array.from({ length: 7 }, (_, day) => day).reduce((total, day) => {
        return dayStates[day] === "gym" ? total + 1 : total;
    }, 0);
}

function resolveTrainingDays(
    profile: ProfileResponse | null,
    dayStates?: Record<number, DayTrainingState> | null
): number {
    const fromSchedule = countGymDays(dayStates);
    if (typeof fromSchedule === "number" && fromSchedule > 0) {
        return fromSchedule;
    }

    const fromProfile = profile?.available_days_per_week ?? 3;
    return Math.max(1, Math.min(7, fromProfile));
}

function pickSplitType(days: number, experience: ProfileResponse["experience_level"]): SplitType {
    if (days <= 2) {
        return "full_body";
    }

    if (days === 3) {
        return "push_pull_legs";
    }

    if (days === 4) {
        return "upper_lower";
    }

    return experience === "advanced" ? "push_pull_legs" : "upper_lower";
}

function buildLabel(splitType: SplitType, goal: ProfileResponse["goal"]): string {
    if (goal === "improve endurance") {
        if (splitType === "full_body") {
            return "Cardio + Legs Day";
        }
        if (splitType === "upper_lower") {
            return "Upper Body + Cardio";
        }
    }

    if (splitType === "push_pull_legs") {
        return "Push / Pull / Legs";
    }

    if (splitType === "upper_lower") {
        return "Upper Body / Lower Body";
    }

    return "Full Body";
}

export function recommendWorkoutPlan(
    profile: ProfileResponse | null,
    dayStates?: Record<number, DayTrainingState> | null
): WorkoutPlanRecommendation {
    const days = resolveTrainingDays(profile, dayStates);
    const splitType = pickSplitType(days, profile?.experience_level ?? null);
    const label = buildLabel(splitType, profile?.goal ?? null);

    const rationaleParts: string[] = [];
    rationaleParts.push(`${days} gym day${days > 1 ? "s" : ""} selected`);

    if (profile?.experience_level) {
        rationaleParts.push(`${profile.experience_level} level`);
    }

    if (profile?.goal) {
        rationaleParts.push(`goal: ${profile.goal}`);
    }

    return {
        splitType,
        label,
        rationale: rationaleParts.join(" • "),
    };
}
