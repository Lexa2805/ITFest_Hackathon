import api from './api';

// ── Types ────────────────────────────────────────────────────

export interface RecipeSuggestion {
  id: string;
  name: string;
  source_url: string;
  metadata: {
    ingredients: string[];
    macros: { kcal: number; protein: number; fat: number; carbs: number };
  };
  match_score: number;
  missing_ingredients: string[];
}

export interface DayPlan {
  day: string;
  meals: { meal_type: 'breakfast' | 'lunch' | 'dinner'; recipe: RecipeSuggestion }[];
  daily_macros: { kcal: number; protein: number };
}

export interface ShoppingItem {
  name: string;
  quantity_needed: number;
  unit: string;
  category: string;
}

export interface RecipeInstructions {
  instructions: string[];
  source_url: string;
}

// ── API calls ────────────────────────────────────────────────

export async function suggestRecipes(
  fridgeItems: any[],
  userProfile: any,
  mealType?: string
): Promise<{ suggestions: RecipeSuggestion[] }> {
  const { data } = await api.post('/recipes/suggest', {
    fridge_items: fridgeItems,
    user_profile: userProfile,
    meal_type: mealType ?? null,
  }, { timeout: 60_000 });
  return data;
}

export async function getWeeklyPlan(
  userProfile: any,
  fridgeItems: any[]
): Promise<{ week_plan: DayPlan[] }> {
  const { data } = await api.post('/recipes/weekly-plan', {
    user_profile: userProfile,
    fridge_items: fridgeItems,
  }, { timeout: 90_000 });
  return data;
}

export async function getShoppingList(
  selectedRecipes: any[],
  fridgeItems: any[]
): Promise<{ shopping_list: ShoppingItem[] }> {
  const { data } = await api.post('/recipes/shopping-list', {
    selected_recipes: selectedRecipes,
    fridge_items: fridgeItems,
  }, { timeout: 60_000 });
  return data;
}

export async function getRecipeInstructions(
  recipeId: string
): Promise<RecipeInstructions> {
  const { data } = await api.get(`/recipes/${recipeId}/instructions`);
  return data;
}
