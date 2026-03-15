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

const GENERIC_EXERCISE_PHOTO = "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80";

const REMOTE_EXERCISE_NAME_IMAGES: Record<string, string> = {
    "push-ups": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80",
    "dumbbell bench press": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80",
    "barbell bench press": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=80",
    "bent over rows": "https://images.unsplash.com/photo-1598971639058-a86d8a8f6f95?auto=format&fit=crop&w=1200&q=80",
    "pull-ups": "https://images.unsplash.com/photo-1574680178050-55c6a6a96e0a?auto=format&fit=crop&w=1200&q=80",
    deadlifts: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1200&q=80",
    "bodyweight squats": "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=1200&q=80",
    lunges: "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=1200&q=80",
    plank: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
    burpees: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80",
};

const REMOTE_MUSCLE_GROUP_IMAGES: Record<string, string> = {
    chest: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80",
    back: "https://images.unsplash.com/photo-1598971639058-a86d8a8f6f95?auto=format&fit=crop&w=1200&q=80",
    shoulders: "https://images.unsplash.com/photo-1584466977773-e625c37cdd50?auto=format&fit=crop&w=1200&q=80",
    arms: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80",
    biceps: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80",
    triceps: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80",
    legs: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=1200&q=80",
    glutes: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=1200&q=80",
    hamstrings: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=1200&q=80",
    quadriceps: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=1200&q=80",
    calves: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=1200&q=80",
    core: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
    full_body: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80",
    "full body": "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1200&q=80",
    push: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80",
    pull: "https://images.unsplash.com/photo-1598971639058-a86d8a8f6f95?auto=format&fit=crop&w=1200&q=80",
    "rear delts": "https://images.unsplash.com/photo-1584466977773-e625c37cdd50?auto=format&fit=crop&w=1200&q=80",
    recovery: "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?auto=format&fit=crop&w=1200&q=80",
};

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

    if (
        value.includes("example.com/demos/") ||
        value.includes("localhost") ||
        value.includes("127.0.0.1")
    ) {
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
    const nameMappedRemote = REMOTE_EXERCISE_NAME_IMAGES[normalizedName];
    if (nameMappedRemote) {
        return { uri: nameMappedRemote };
    }

    const nameMappedAsset = EXERCISE_NAME_TO_ASSET[normalizedName];
    if (nameMappedAsset) {
        return LOCAL_EXERCISE_ASSETS[nameMappedAsset];
    }

    const normalizedGroup = normalize(exercise.muscle_group);
    const groupMappedRemote = REMOTE_MUSCLE_GROUP_IMAGES[normalizedGroup];
    if (groupMappedRemote) {
        return { uri: groupMappedRemote };
    }

    const groupMappedAsset = MUSCLE_GROUP_TO_ASSET[normalizedGroup];
    if (groupMappedAsset) {
        return LOCAL_EXERCISE_ASSETS[groupMappedAsset];
    }

    return { uri: GENERIC_EXERCISE_PHOTO };
}
