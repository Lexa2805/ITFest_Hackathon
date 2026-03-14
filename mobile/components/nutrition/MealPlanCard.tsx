import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PlannedMeal } from "@/services/nutritionApi";
import { theme } from "@/constants/theme";

interface MealPlanCardProps {
    mealType: string;
    meals: PlannedMeal[];
}

export function MealPlanCard({ mealType, meals }: MealPlanCardProps) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>{mealType}</Text>
            {meals.length === 0 ? (
                <Text style={styles.empty}>No meal generated.</Text>
            ) : (
                meals.map((meal, index) => (
                    <View key={`${meal.meal_name}-${index}`} style={styles.mealBlock}>
                        <Text style={styles.mealName}>{meal.meal_name}</Text>
                        {meal.ingredients.map((ingredient, ingredientIndex) => (
                            <Text key={`${ingredient.name}-${ingredientIndex}`} style={styles.ingredient}>
                                • {ingredient.name} — {ingredient.grams}g
                            </Text>
                        ))}
                        <Text style={styles.macros}>
                            {meal.kcal} kcal · P {meal.protein_g}g · F {meal.fat_g}g · C {meal.carbs_g}g
                        </Text>
                    </View>
                ))
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.sm,
        padding: 14,
        gap: 8,
    },
    title: {
        color: theme.colors.green.primary,
        fontSize: 15,
        fontWeight: "700",
        textTransform: "capitalize",
    },
    empty: {
        color: theme.colors.text.muted,
        fontSize: 13,
    },
    mealBlock: {
        gap: 3,
        paddingBottom: 8,
    },
    mealName: {
        color: theme.colors.text.primary,
        fontSize: 14,
        fontWeight: "600",
    },
    ingredient: {
        color: theme.colors.text.secondary,
        fontSize: 12,
    },
    macros: {
        color: theme.colors.text.muted,
        fontSize: 12,
        marginTop: 2,
    },
});
