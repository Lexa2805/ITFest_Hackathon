from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import httpx

from app.services.supabase_client import get_supabase
from app.services.recipe_rag_service import RecipeRAGService
from app.services.shopping_service import ShoppingService # Adjust based on exports

router = APIRouter()

class SuggestRecipeRequest(BaseModel):
    fridge_items: List[Dict[str, Any]]
    user_profile: Dict[str, Any]
    meal_type: Optional[str] = None

class WeeklyPlanRequest(BaseModel):
    user_profile: Dict[str, Any]
    fridge_items: List[Dict[str, Any]]

class ShoppingListRequest(BaseModel):
    selected_recipes: List[Dict[str, Any]]
    fridge_items: List[Dict[str, Any]]

@router.post("/suggest")
async def suggest_recipes(req: SuggestRecipeRequest):
    supabase = get_supabase()
    rag_service = RecipeRAGService(supabase)
    results = rag_service.get_recipes_from_fridge(req.fridge_items, req.user_profile, top_k=5)
    return {"suggestions": results}

@router.post("/weekly-plan")
async def weekly_plan(req: WeeklyPlanRequest):
    supabase = get_supabase()
    rag_service = RecipeRAGService(supabase)
    plan = rag_service.get_weekly_meal_plan(req.user_profile, req.fridge_items)
    return plan

@router.post("/shopping-list")
async def create_shopping_list(req: ShoppingListRequest):
    shopping_svc = ShoppingService() # Assuming available
    list_items = await shopping_svc.generate_shopping_list(req.selected_recipes, req.fridge_items)
    return {"shopping_list": list_items}

@router.get("/{recipe_id}/instructions")
async def get_recipe_instructions(recipe_id: str):
    # Fetch recipe from DB to get source_url
    supabase = get_supabase()
    response = supabase.table("recipe_embeddings").select("source_url").eq("id", recipe_id).execute()
    data = response.data
    
    if not data or not data[0].get("source_url"):
        raise HTTPException(status_code=404, detail="Recipe not found or no source URL")
        
    source_url = data[0]["source_url"]
    
    # In a real system, we'd make an HTTP request to source_url and parse instructions.
    # Below is a stub for the HTTP fetch
    async with httpx.AsyncClient() as client:
        try:
            # resp = await client.get(source_url)
            # instructions = parse_html_for_instructions(resp.text)
            instructions = [
                "1. Gather ingredients.",
                "2. Follow the detailed steps from " + source_url
            ]
            return {"instructions": instructions, "source_url": source_url}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
