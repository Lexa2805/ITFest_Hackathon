/**
 * Zustand store for the RAG Recipe Flow.
 * Manages state for Flow A (tonight's picks) and Flow B (weekly plan).
 */

import { create } from "zustand";
import api from "@/services/api";
import {
  suggestRecipes,
  getWeeklyPlan,
  getShoppingList,
  getRecipeInstructions,
  type RecipeSuggestion,
  type DayPlan,
  type ShoppingItem,
  type RecipeInstructions,
} from "@/services/recipeApi";

// ── Types ────────────────────────────────────────────────────

interface FridgeItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  category: string;
}

interface RecipeFlowState {
  // Data
  suggestions: RecipeSuggestion[];
  selectedRecipe: RecipeSuggestion | null;
  recipeInstructions: RecipeInstructions | null;
  weekPlan: DayPlan[] | null;
  shoppingList: ShoppingItem[];
  fridgeItems: FridgeItem[];

  // Loading flags
  isLoadingSuggestions: boolean;
  isLoadingPlan: boolean;
  isLoadingInstructions: boolean;
  isLoadingShoppingList: boolean;
  isLoadingSwap: boolean;

  // Error states
  suggestionsError: string | null;
  planError: string | null;
  instructionsError: string | null;
  shoppingListError: string | null;
  swapError: string | null;

  // Actions
  fetchSuggestions: (userProfile: any, mealType?: string) => Promise<void>;
  fetchWeeklyPlan: (userProfile: any) => Promise<void>;
  fetchRecipeInstructions: (recipeId: string) => Promise<void>;
  fetchShoppingList: (selectedRecipes: RecipeSuggestion[]) => Promise<void>;
  swapMeal: (dayIndex: number, mealIndex: number, newRecipe: RecipeSuggestion) => void;
  selectRecipe: (recipe: RecipeSuggestion) => void;
  clearErrors: () => void;
  resetFlow: () => void;
}

// ── Helpers ──────────────────────────────────────────────────

async function fetchFridgeItems(): Promise<FridgeItem[]> {
  try {
    const { data } = await api.get("/fridge/items");
    return data?.data ?? data ?? [];
  } catch {
    return [];
  }
}

// ── Store ────────────────────────────────────────────────────

export const useRecipeFlowStore = create<RecipeFlowState>((set, get) => ({
  // Data
  suggestions: [],
  selectedRecipe: null,
  recipeInstructions: null,
  weekPlan: null,
  shoppingList: [],
  fridgeItems: [],

  // Loading flags
  isLoadingSuggestions: false,
  isLoadingPlan: false,
  isLoadingInstructions: false,
  isLoadingShoppingList: false,
  isLoadingSwap: false,

  // Error states
  suggestionsError: null,
  planError: null,
  instructionsError: null,
  shoppingListError: null,
  swapError: null,

  // ── Actions ──────────────────────────────────────────────

  fetchSuggestions: async (userProfile, mealType) => {
    if (get().isLoadingSuggestions) return; // duplicate guard
    set({ isLoadingSuggestions: true, suggestionsError: null });

    try {
      const fridgeItems = await fetchFridgeItems();
      const res = await suggestRecipes(fridgeItems, userProfile, mealType);
      const sorted = [...(res.suggestions ?? [])].sort(
        (a, b) => b.match_score - a.match_score
      );
      set({ suggestions: sorted, fridgeItems, isLoadingSuggestions: false });
    } catch {
      set({
        suggestionsError: "Couldn't load suggestions",
        isLoadingSuggestions: false,
      });
    }
  },

  fetchWeeklyPlan: async (userProfile) => {
    if (get().isLoadingPlan) return; // duplicate guard
    set({ isLoadingPlan: true, planError: null });

    try {
      const fridgeItems = await fetchFridgeItems();
      const res = await getWeeklyPlan(userProfile, fridgeItems);
      set({ weekPlan: res.week_plan, fridgeItems, isLoadingPlan: false });
    } catch {
      set({
        planError: "Couldn't generate your plan",
        isLoadingPlan: false,
      });
    }
  },

  fetchRecipeInstructions: async (recipeId) => {
    set({ isLoadingInstructions: true, instructionsError: null });

    try {
      const instructions = await getRecipeInstructions(recipeId);
      set({ recipeInstructions: instructions, isLoadingInstructions: false });
    } catch {
      set({
        instructionsError: "Instructions unavailable",
        isLoadingInstructions: false,
      });
    }
  },

  fetchShoppingList: async (selectedRecipes) => {
    if (get().isLoadingShoppingList) return; // duplicate guard
    set({ isLoadingShoppingList: true, shoppingListError: null });

    try {
      const { fridgeItems } = get();
      const res = await getShoppingList(selectedRecipes, fridgeItems);
      set({ shoppingList: res.shopping_list ?? [], isLoadingShoppingList: false });
    } catch {
      set({
        shoppingListError: "Couldn't generate shopping list",
        isLoadingShoppingList: false,
      });
    }
  },

  swapMeal: (dayIndex, mealIndex, newRecipe) => {
    const { weekPlan } = get();
    if (!weekPlan) return;

    const updated = weekPlan.map((day, di) => {
      if (di !== dayIndex) return day;

      const meals = day.meals.map((meal, mi) =>
        mi === mealIndex ? { ...meal, recipe: newRecipe } : meal
      );

      // Recalculate daily macros from all meals
      const daily_macros = meals.reduce(
        (acc, m) => ({
          kcal: acc.kcal + (m.recipe.metadata?.macros?.kcal ?? 0),
          protein: acc.protein + (m.recipe.metadata?.macros?.protein ?? 0),
        }),
        { kcal: 0, protein: 0 }
      );

      return { ...day, meals, daily_macros };
    });

    set({ weekPlan: updated });
  },

  selectRecipe: (recipe) => {
    set({ selectedRecipe: recipe, recipeInstructions: null });
  },

  clearErrors: () => {
    set({
      suggestionsError: null,
      planError: null,
      instructionsError: null,
      shoppingListError: null,
      swapError: null,
    });
  },

  resetFlow: () => {
    set({
      suggestions: [],
      selectedRecipe: null,
      recipeInstructions: null,
      weekPlan: null,
      shoppingList: [],
      fridgeItems: [],
      isLoadingSuggestions: false,
      isLoadingPlan: false,
      isLoadingInstructions: false,
      isLoadingShoppingList: false,
      isLoadingSwap: false,
      suggestionsError: null,
      planError: null,
      instructionsError: null,
      shoppingListError: null,
      swapError: null,
    });
  },
}));
