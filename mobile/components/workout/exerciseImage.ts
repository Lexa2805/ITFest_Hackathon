import type { ImageSourcePropType } from "react-native";

import type { Exercise } from "@/types/workout";

const chestImage = require("../../assets/images/android-icon-foreground.png");
const backImage = require("../../assets/images/android-icon-background.png");
const shouldersImage = require("../../assets/images/android-icon-monochrome.png");
const legsImage = require("../../assets/images/splash-icon.png");
const coreImage = require("../../assets/images/favicon.png");
const fullBodyImage = require("../../assets/images/icon.png");

const LOCAL_EXERCISE_ASSETS = {
    chest: chestImage,
    back: backImage,
    shoulders: shouldersImage,
    arms: shouldersImage,
    legs: legsImage,
    core: coreImage,
    full_body: fullBodyImage,
} as const;

type LocalExerciseAssetKey = keyof typeof LOCAL_EXERCISE_ASSETS;

const EXERCISE_NAME_TO_ASSET: Record<string, LocalExerciseAssetKey> = {
    "push-ups": "chest",
    "dumbbell bench press": "chest",
    "barbell bench press": "chest",
    "pull-ups": "back",
    deadlifts: "back",
    "bodyweight squats": "legs",
    "barbell back squats": "legs",
    lunges: "legs",
    plank: "core",
    burpees: "full_body",
};

const MUSCLE_GROUP_TO_ASSET: Record<string, LocalExerciseAssetKey> = {
    chest: "chest",
    back: "back",
    shoulders: "shoulders",
    arms: "arms",
    biceps: "arms",
    triceps: "arms",
    legs: "legs",
    glutes: "legs",
    hamstrings: "legs",
    quadriceps: "legs",
    calves: "legs",
    core: "core",
    full_body: "full_body",
    "full body": "full_body",
    push: "chest",
    pull: "back",
};

function normalize(value: string | null | undefined): string {
    return value?.trim().toLowerCase() ?? "";
}

function resolveLocalAssetKey(rawValue: string | null | undefined): LocalExerciseAssetKey | null {
    const value = normalize(rawValue);
    if (!value) {
        return null;
    }

    if (value.startsWith("asset:")) {
        const fromPrefix = value.slice("asset:".length).trim() as LocalExerciseAssetKey;
        if (fromPrefix in LOCAL_EXERCISE_ASSETS) {
            return fromPrefix;
        }
    }

    if (value in LOCAL_EXERCISE_ASSETS) {
        return value as LocalExerciseAssetKey;
    }

    return null;
}

function resolveDirectUri(rawValue: string | null | undefined): string | null {
    const value = rawValue?.trim();
    if (!value) {
        return null;
    }

    if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/")) {
        return value;
    }

    return null;
}

export function getExerciseImageSource(exercise: Exercise): ImageSourcePropType | null {
    const localKeyFromImageField = resolveLocalAssetKey(exercise.image);
    if (localKeyFromImageField) {
        return LOCAL_EXERCISE_ASSETS[localKeyFromImageField];
    }

    const uriFromImageField = resolveDirectUri(exercise.image);
    if (uriFromImageField) {
        return { uri: uriFromImageField };
    }

    const uriFromDemonstration = resolveDirectUri(exercise.demonstration_url);
    if (uriFromDemonstration) {
        return { uri: uriFromDemonstration };
    }

    const normalizedName = normalize(exercise.name);
    const nameMappedAsset = EXERCISE_NAME_TO_ASSET[normalizedName];
    if (nameMappedAsset) {
        return LOCAL_EXERCISE_ASSETS[nameMappedAsset];
    }

    const normalizedGroup = normalize(exercise.muscle_group);
    const groupMappedAsset = MUSCLE_GROUP_TO_ASSET[normalizedGroup];
    if (groupMappedAsset) {
        return LOCAL_EXERCISE_ASSETS[groupMappedAsset];
    }

    return null;
}
