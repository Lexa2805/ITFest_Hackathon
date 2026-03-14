import os
import json
import logging
from typing import List, Dict, Any
from supabase import create_client, Client
import httpx

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    logger.error("Missing Supabase credentials")
    exit(1)

if not OPENROUTER_API_KEY:
    logger.error("Missing OpenRouter API key")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
OPENROUTER_URL = "https://openrouter.ai/api/v1"

def get_embedding(text: str) -> List[float]:
    """Generates embeddings using OpenRouter API."""
    logger.info(f"Generating embedding for text (len: {len(text)})")
    
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

def ingest_recipes(recipes: List[Dict[str, Any]]):
    """
    Ingests raw recipe data into the recipe_embeddings table.
    recipes format:
    [
        {
            "name": "Spicy Chicken Bowl",
            "ingredients": ["Chicken", "Rice", "Spices", "Chili"],
            "tags": ["healthy", "spicy", "high-protein"],
            "kcal": 550,
            "protein": 40,
            "carbs": 50,
            "fat": 15,
            "prep_time_min": 25,
            "meal_type": "lunch",
            "source_url": "https://example.com/recipe1",
            "cuisine": "Mexican"
        }
    ]
    """
    for recipe in recipes:
        try:
            # Create chunk text (~40 tokens constraint)
            # Format: "{name} {main ingredients} {tags} {kcal}kcal {protein}g protein {prep_time}min {meal_type}"
            ingreds = ", ".join(recipe.get("ingredients", [])[:5])
            tags = ", ".join(recipe.get("tags", []))
            
            chunk_text = (
                f"{recipe['name']} {ingreds} {tags} "
                f"{recipe.get('kcal', 0)}kcal {recipe.get('protein', 0)}g protein "
                f"{recipe.get('prep_time_min', 0)}min {recipe.get('meal_type', '')}"
            )
            
            # Embed the chunk via OpenRouter
            embedding = get_embedding(chunk_text)
            
            # Metadata construction
            metadata = {
                "ingredients": recipe.get("ingredients", []),
                "macros": {
                    "kcal": recipe.get("kcal", 0),
                    "protein": recipe.get("protein", 0),
                    "carbs": recipe.get("carbs", 0),
                    "fat": recipe.get("fat", 0)
                },
                "prep_time_min": recipe.get("prep_time_min", 0),
                "meal_type": recipe.get("meal_type", ""),
                "tags": recipe.get("tags", []),
                "cuisine": recipe.get("cuisine", "")
            }
            
            # Upsert into Supabase
            data = {
                "name": recipe["name"],
                "source_url": recipe.get("source_url", ""),
                "embedding": embedding,
                "metadata": metadata
            }
            
            logger.info(f"Ingesting recipe: {recipe['name']}")
            supabase.table("recipe_embeddings").insert(data).execute()
        
        except Exception as e:
            logger.error(f"Error ingesting recipe {recipe.get('name', 'Unknown')}: {e}")

if __name__ == "__main__":
    # Example test usage
    sample_recipes = [
        {
            "name": "Quick Avocado Chicken Salad",
            "ingredients": ["Chicken Breast", "Avocado", "Lettuce", "Olive Oil", "Lemon"],
            "tags": ["keto", "low-carb", "quick"],
            "kcal": 420,
            "protein": 35,
            "carbs": 12,
            "fat": 28,
            "prep_time_min": 15,
            "meal_type": "lunch",
            "source_url": "https://example.com/avocado-chicken",
            "cuisine": "American"
        }
    ]
    ingest_recipes(sample_recipes)
