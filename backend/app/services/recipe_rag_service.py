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
        """Calculate simple overlap score between fridge items and ingredients."""
        fridge_set = set([i.lower().strip() for i in fridge_items])
        if not fridge_set or not recipe_ingredients:
            return 0.0
        
        match_count = 0
        for ing in recipe_ingredients:
            lower_ing = ing.lower().strip()
            # Simple substring match
            if any(f_item in lower_ing for f_item in fridge_set):
                match_count += 1
        
        return match_count / len(recipe_ingredients)

    def get_recipes_from_fridge(self, fridge_items: List[Dict[str, Any]], user_profile: Dict[str, Any], top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieves recipes based on fridge contents and user profile.
        """
        # Sort fridge items by quantity (assuming "quantity" key exists, or just take top 5)
        top_fridge = [item.get("name", "") for item in fridge_items[:5]]
        fridge_str = ", ".join(top_fridge)
        
        dietary_tags = ", ".join(user_profile.get("dietary_restrictions", []))
        calorie_goal = user_profile.get("daily_calorie_goal", 2000)
        
        # Build query string
        query_text = f"{fridge_str} {dietary_tags} {calorie_goal}kcal"
        
        # 1. Embed query
        query_embedding = self._get_embedding(query_text)
        
        # 2. Vector Search via RPC
        response = self.supabase.rpc(
            "match_recipes",
            {
                "query_embedding": query_embedding,
                "match_threshold": 0.70, # Cosine similarity threshold
                "match_count": top_k * 2 # Fetch more for post-filtering
            }
        ).execute()
        
        candidates = response.data or []
        
        # 3. Post-filtering
        results = []
        for cand in candidates:
            meta = cand.get("metadata", {})
            recipe_ingredients = meta.get("ingredients", [])
            overlap = self._calculate_overlap_score(recipe_ingredients, top_fridge)
            
            # Identify missing ingredients
            fridge_names_lower = [f.lower() for f in top_fridge]
            missing = [ing for ing in recipe_ingredients if not any(f_name in ing.lower() for f_name in fridge_names_lower)]
            
            # Basic macro fit (example logic)
            recipe_kcal = meta.get("macros", {}).get("kcal", 0)
            target_meal_kcal = calorie_goal / 3.0 # Basic 3 meals assumption
            macro_fit_score = 1 - min(abs(recipe_kcal - target_meal_kcal) / target_meal_kcal, 1.0)
            
            # Final scoring (combine vector similarity, overlap, and macro fit)
            final_score = cand.get("similarity", 0) * 0.4 + overlap * 0.4 + macro_fit_score * 0.2
            
            results.append({
                "id": cand["id"],
                "name": cand["name"],
                "source_url": cand["source_url"],
                "metadata": meta,
                "match_score": final_score,
                "missing_ingredients": missing
            })
            
        # Sort and return top 5
        results = sorted(results, key=lambda x: x["match_score"], reverse=True)
        return results[:5]

    def get_weekly_meal_plan(self, user_profile: Dict[str, Any], fridge_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generates a structured 7-day meal plan.
        """
        # Very simplified generation for demonstration: 
        # In a real app we'd construct a comprehensive plan utilizing vector search with variety constraints.
        # Here we'll grab top 21 recipes and distribute them.
        
        candidates = self.get_recipes_from_fridge(fridge_items, user_profile, top_k=25)
        
        plan = []
        days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        cand_idx = 0
        for day in days_of_week:
            day_plan = {
                "day": day,
                "meals": []
            }
            daily_kcal = 0
            daily_protein = 0
            
            for meal_type in ["breakfast", "lunch", "dinner"]:
                if cand_idx < len(candidates):
                    recipe = candidates[cand_idx]
                    day_plan["meals"].append({
                        "meal_type": meal_type,
                        "recipe": recipe
                    })
                    
                    daily_kcal += recipe["metadata"].get("macros", {}).get("kcal", 0)
                    daily_protein += recipe["metadata"].get("macros", {}).get("protein", 0)
                    cand_idx += 1
                    
            day_plan["daily_macros"] = {"kcal": daily_kcal, "protein": daily_protein}
            plan.append(day_plan)
            
        return {"week_plan": plan}
