import React, { useEffect, useMemo, useState } from "react";
import {
    Image,
    StyleSheet,
    Text,
    View,
    type ImageStyle,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { theme } from "../../constants/theme";
import type { Exercise } from "../../types/workout";
import { getExerciseImageSource } from "./exerciseImage";

interface ExerciseImageViewProps {
    exercise: Exercise | null | undefined;
    height: number;
    style?: StyleProp<ViewStyle>;
    imageStyle?: StyleProp<ImageStyle>;
    placeholderLabel?: string;
}

export function ExerciseImageView({
    exercise,
    height,
    style,
    imageStyle,
    placeholderLabel = "No image available",
}: ExerciseImageViewProps) {
    const source = useMemo(() => (exercise ? getExerciseImageSource(exercise) : null), [exercise]);
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [source, exercise?.id]);

    const isRemoteSource =
        typeof source === "object" && source !== null && "uri" in source && typeof source.uri === "string";

    if (source && !(isRemoteSource && imageFailed)) {
        return (
            <View style={[styles.frame, { height }, style]}>
                <Image
                    source={source}
                    style={[styles.image, imageStyle]}
                    resizeMode="cover"
                    onError={() => {
                        if (isRemoteSource) {
                            setImageFailed(true);
                        }
                    }}
                />
            </View>
        );
    }

    const initials = exercise?.name
        ? exercise.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part: string) => part[0]?.toUpperCase() ?? "")
            .join("")
        : "EX";

    return (
        <View style={[styles.frame, styles.placeholder, { height }, style]}>
            <View style={styles.placeholderMark}>
                <Text style={styles.placeholderInitials}>{initials}</Text>
            </View>
            <Text style={styles.placeholderTitle}>{exercise?.name ?? "Exercise"}</Text>
            <Text style={styles.placeholderText}>{placeholderLabel}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    frame: {
        width: "100%",
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.08)",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    placeholder: {
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingHorizontal: 16,
        backgroundColor: theme.colors.background.secondary,
    },
    placeholderMark: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(57,255,136,0.12)",
        borderWidth: 1,
        borderColor: "rgba(57,255,136,0.25)",
    },
    placeholderInitials: {
        fontSize: 20,
        fontWeight: "800",
        color: theme.colors.green.primary,
    },
    placeholderTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: theme.colors.text.primary,
        textAlign: "center",
    },
    placeholderText: {
        fontSize: 12,
        fontWeight: "600",
        color: theme.colors.text.muted,
        textAlign: "center",
    },
});
