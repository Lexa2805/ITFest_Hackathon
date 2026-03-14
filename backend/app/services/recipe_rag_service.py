import os
import json
import logging
from typing import List, Dict, Any, Optional
import httpx
from supabase import Client

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1"

class RecipeRAGService:
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client

    def _get_embedding(self, text: str) -> List[float]:
        """Generates embeddings using OpenRouter API."""
        if not OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not set.")
            
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "openai/text-embedding-ada-002",
            "input": [text]
        }
        
        response = httpx.post(
            f"{OPENROUTER_URL}/embeddings", 
            headers=headers, 
            json=payload,
            timeout=30.0
        )
        response.raise_for_status()
        data = response.json()
        return data["data"][0]["embedding"]

    def _calculate_overlap_score(self, recipe_ingredients: List[str], fridge_items: List[str]) -> float:
        """Calculate overlap score between fridge items and recipe ingredients."""
        fridge_set = set([i.lower().strip() for i in fridge_items])
        if not fridge_set or not recipe_ingredients:
            return 0.0
        
        match_count = 0
        for ing in recipe_ingredients:
            lower_ing = ing.lower().strip()
            if any(f_item in lower_ing or lower_ing in f_item for f_item in fridge_set):
                match_count += 1
        
        return match_count / len(recipe_ingredients)

    async def get_recipes_from_fridge(self, fridge_items: List[Dict[str, Any]], user_profile: Dict[str, Any], top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieves recipes based on ALL fridge contents and user profile.
        """
        # Use ALL fridge items, not just top 5
        all_fridge_names = [item.get("name", "") for item in fridge_items if item.get("name")]
        fridge_str = ", ".join(all_fridge_names)
        
        dietary_tags = ", ".join(user_profile.get("dietary_restrictions", []))
        calorie_goal = user_profile.get("daily_calorie_goal", 2000)
        weekly_budget = user_profile.get("weekly_budget")
        
        # Build query string with all fridge items
        query_text = f"recipes using: {fridge_str}"
        if dietary_tags:
            query_text += f" dietary: {dietary_tags}"
        query_text += f" {calorie_goal}kcal"
        
        # 1. Embed query
        query_embedding = self._get_embedding(query_text)
        
        # 2. Vector Search via RPC — lower threshold to get more results
        response = await self.supabase.rpc(
            "match_recipes",
            {
                "query_embedding": query_embedding,
                "match_threshold": 0.50,
                "match_count": max(top_k * 3, 60)
            }
        ).execute()
        
        candidates = response.data or []
        
        # 3. If vector search returned nothing, try a direct table scan as fallback
        if not candidates:
            logger.warning("Vector search returned 0 results, falling back to table scan")
            fallback = await self.supabase.table("recipe_embeddings").select("*").limit(top_k * 3).execute()
            candidates = fallback.data or []
        
        # 4. Post-filtering and scoring
        results = []
        per_meal_budget = None
        if weekly_budget and weekly_budget > 0:
            per_meal_budget = weekly_budget / 21.0  # 3 meals * 7 days
        
        for cand in candidates:
            meta = cand.get("metadata", {})
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except (json.JSONDecodeError, TypeError):
                    meta = {}
            
            recipe_ingredients = meta.get("ingredients", [])
            overlap = self._calculate_overlap_score(recipe_ingredients, all_fridge_names)
            
            # Identify missing ingredients
            fridge_names_lower = [f.lower().strip() for f in all_fridge_names]
            missing = []
            for ing in recipe_ingredients:
                ing_lower = ing.lower().strip()
                if not any(f_name in ing_lower or ing_lower in f_name for f_name in fridge_names_lower):
                    missing.append(ing)
            
            # Macro fit scoring
            recipe_kcal = meta.get("macros", {}).get("kcal", 0) if isinstance(meta.get("macros"), dict) else 0
            target_meal_kcal = calorie_goal / 3.0
            if target_meal_kcal > 0 and recipe_kcal > 0:
                macro_fit_score = 1 - min(abs(recipe_kcal - target_meal_kcal) / target_meal_kcal, 1.0)
            else:
                macro_fit_score = 0.5
            
            # Budget fit scoring
            budget_score = 1.0
            estimated_cost = meta.get("estimated_cost", 0)
            if per_meal_budget and estimated_cost and estimated_cost > 0:
                if estimated_cost <= per_meal_budget:
                    budget_score = 1.0
                else:
                    budget_score = max(0, 1 - (estimated_cost - per_meal_budget) / per_meal_budget)
            
            # Final scoring: similarity + overlap + macro fit + budget
            similarity = cand.get("similarity", 0.5)
            final_score = similarity * 0.3 + overlap * 0.35 + macro_fit_score * 0.2 + budget_score * 0.15
            
            results.append({
                "id": cand.get("id", ""),
                "name": cand.get("name", "Unknown Recipe"),
                "source_url": cand.get("source_url", ""),
                "metadata": meta,
                "match_score": round(final_score, 3),
                "missing_ingredients": missing,
                "estimated_cost": estimated_cost,
            })
            
        results = sorted(results, key=lambda x: x["match_score"], reverse=True)
        return results[:top_k]

    async def get_weekly_meal_plan(self, user_profile: Dict[str, Any], fridge_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generates a structured 7-day meal plan with 3 meals per day.
        Reuses recipes cyclically if fewer than 21 are available.
        """
        candidates = await self.get_recipes_from_fridge(fridge_items, user_profile, top_k=25)
        
        if not candidates:
            # Return empty plan with placeholder message
            return {"week_plan": [
                {"day": day, "meals": [], "daily_macros": {"kcal": 0, "protein": 0}}
                for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            ]}
        
        plan = []
        days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        weekly_cost = 0.0
        
        for day_idx, day in enumerate(days_of_week):
            day_plan = {"day": day, "meals": []}
            daily_kcal = 0
            daily_protein = 0
            daily_cost = 0.0
            
            for meal_idx, meal_type in enumerate(["breakfast", "lunch", "dinner"]):
                # Cycle through candidates so every meal slot gets filled
                recipe_idx = (day_idx * 3 + meal_idx) % len(candidates)
                recipe = candidates[recipe_idx]
                
                day_plan["meals"].append({
                    "meal_type": meal_type,
                    "recipe": recipe
                })
                
                macros = recipe.get("metadata", {}).get("macros", {})
                if isinstance(macros, dict):
                    daily_kcal += macros.get("kcal", 0)
                    daily_protein += macros.get("protein", 0)
                daily_cost += recipe.get("estimated_cost", 0)
                    
            day_plan["daily_macros"] = {"kcal": daily_kcal, "protein": daily_protein}
            day_plan["daily_cost"] = round(daily_cost, 2)
            weekly_cost += daily_cost
            plan.append(day_plan)
        
        weekly_budget = user_profile.get("weekly_budget")
            
        return {
            "week_plan": plan,
            "weekly_cost_estimate": round(weekly_cost, 2),
            "weekly_budget": weekly_budget,
        }
