import os
import sys
import json
import logging
from typing import List, Dict, Any
from pathlib import Path

# Load .env from backend directory
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from supabase import create_client, Client
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    sys.exit(1)

if not OPENROUTER_API_KEY:
    logger.error("Missing OPENROUTER_API_KEY in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
OPENROUTER_URL = "https://openrouter.ai/api/v1"


def get_embedding(text: str) -> List[float]:
    """Generates embeddings using OpenRouter API."""
    logger.info(f"Generating embedding for: {text[:80]}...")
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {"model": "openai/text-embedding-ada-002", "input": [text]}
    response = httpx.post(
        f"{OPENROUTER_URL}/embeddings", headers=headers, json=payload, timeout=30.0
    )
    response.raise_for_status()
    return response.json()["data"][0]["embedding"]


def ingest_recipes(recipes: List[Dict[str, Any]]):
    """Ingests recipe data into the recipe_embeddings table."""
    for i, recipe in enumerate(recipes, 1):
        try:
            ingreds = ", ".join(recipe.get("ingredients", [])[:5])
            tags = ", ".join(recipe.get("tags", []))
            chunk_text = (
                f"{recipe['name']} {ingreds} {tags} "
                f"{recipe.get('kcal', 0)}kcal {recipe.get('protein', 0)}g protein "
                f"{recipe.get('prep_time_min', 0)}min {recipe.get('meal_type', '')}"
            )

            embedding = get_embedding(chunk_text)

            metadata = {
                "ingredients": recipe.get("ingredients", []),
                "macros": {
                    "kcal": recipe.get("kcal", 0),
                    "protein": recipe.get("protein", 0),
                    "carbs": recipe.get("carbs", 0),
                    "fat": recipe.get("fat", 0),
                },
                "prep_time_min": recipe.get("prep_time_min", 0),
                "meal_type": recipe.get("meal_type", ""),
                "tags": recipe.get("tags", []),
                "cuisine": recipe.get("cuisine", ""),
                "estimated_cost": recipe.get("estimated_cost", 0),
            }

            data = {
                "name": recipe["name"],
                "source_url": recipe.get("source_url", ""),
                "embedding": embedding,
                "metadata": metadata,
            }

            logger.info(f"[{i}/{len(recipes)}] Ingesting: {recipe['name']}")
            supabase.table("recipe_embeddings").insert(data).execute()

        except Exception as e:
            logger.error(f"Error ingesting {recipe.get('name', '?')}: {e}")


# ---------------------------------------------------------------------------
# Seed dataset — 30 diverse recipes covering breakfast, lunch, dinner
# ---------------------------------------------------------------------------
SEED_RECIPES: List[Dict[str, Any]] = [
    # ── Breakfast ──────────────────────────────────────────────
    {
        "name": "Greek Yogurt Parfait",
        "ingredients": ["Greek Yogurt", "Granola", "Blueberries", "Honey", "Almonds"],
        "tags": ["high-protein", "quick", "vegetarian"],
        "kcal": 350, "protein": 20, "carbs": 45, "fat": 10,
        "prep_time_min": 5, "meal_type": "breakfast",
        "source_url": "https://example.com/yogurt-parfait", "cuisine": "American",
        "estimated_cost": 3.50,
    },
    {
        "name": "Scrambled Eggs with Toast",
        "ingredients": ["Eggs", "Butter", "Bread", "Salt", "Pepper"],
        "tags": ["classic", "quick", "high-protein"],
        "kcal": 380, "protein": 22, "carbs": 30, "fat": 18,
        "prep_time_min": 10, "meal_type": "breakfast",
        "source_url": "https://example.com/scrambled-eggs", "cuisine": "American",
        "estimated_cost": 2.50,
    },
    {
        "name": "Overnight Oats with Banana",
        "ingredients": ["Oats", "Milk", "Banana", "Chia Seeds", "Maple Syrup"],
        "tags": ["meal-prep", "vegetarian", "fiber-rich"],
        "kcal": 400, "protein": 12, "carbs": 65, "fat": 10,
        "prep_time_min": 5, "meal_type": "breakfast",
        "source_url": "https://example.com/overnight-oats", "cuisine": "American",
        "estimated_cost": 2.00,
    },
    {
        "name": "Avocado Toast with Egg",
        "ingredients": ["Bread", "Avocado", "Egg", "Chili Flakes", "Lemon"],
        "tags": ["trendy", "quick", "healthy"],
        "kcal": 420, "protein": 15, "carbs": 35, "fat": 25,
        "prep_time_min": 10, "meal_type": "breakfast",
        "source_url": "https://example.com/avo-toast", "cuisine": "American",
        "estimated_cost": 3.00,
    },
    {
        "name": "Banana Protein Smoothie",
        "ingredients": ["Banana", "Protein Powder", "Milk", "Peanut Butter", "Ice"],
        "tags": ["high-protein", "quick", "post-workout"],
        "kcal": 450, "protein": 35, "carbs": 50, "fat": 12,
        "prep_time_min": 5, "meal_type": "breakfast",
        "source_url": "https://example.com/protein-smoothie", "cuisine": "American",
        "estimated_cost": 3.00,
    },
    # ── Lunch ─────────────────────────────────────────────────
    {
        "name": "Quick Avocado Chicken Salad",
        "ingredients": ["Chicken Breast", "Avocado", "Lettuce", "Olive Oil", "Lemon"],
        "tags": ["keto", "low-carb", "quick"],
        "kcal": 420, "protein": 35, "carbs": 12, "fat": 28,
        "prep_time_min": 15, "meal_type": "lunch",
        "source_url": "https://example.com/avocado-chicken", "cuisine": "American",
        "estimated_cost": 5.00,
    },
    {
        "name": "Spicy Chicken Bowl",
        "ingredients": ["Chicken Breast", "Rice", "Black Beans", "Salsa", "Chili"],
        "tags": ["healthy", "spicy", "high-protein"],
        "kcal": 550, "protein": 40, "carbs": 50, "fat": 15,
        "prep_time_min": 25, "meal_type": "lunch",
        "source_url": "https://example.com/spicy-chicken-bowl", "cuisine": "Mexican",
        "estimated_cost": 4.50,
    },
    {
        "name": "Tuna Wrap",
        "ingredients": ["Canned Tuna", "Tortilla", "Lettuce", "Tomato", "Mayo"],
        "tags": ["quick", "high-protein", "portable"],
        "kcal": 380, "protein": 30, "carbs": 35, "fat": 14,
        "prep_time_min": 10, "meal_type": "lunch",
        "source_url": "https://example.com/tuna-wrap", "cuisine": "American",
        "estimated_cost": 3.50,
    },
    {
        "name": "Caprese Pasta Salad",
        "ingredients": ["Pasta", "Mozzarella", "Tomato", "Basil", "Olive Oil"],
        "tags": ["vegetarian", "italian", "cold"],
        "kcal": 480, "protein": 18, "carbs": 55, "fat": 20,
        "prep_time_min": 20, "meal_type": "lunch",
        "source_url": "https://example.com/caprese-pasta", "cuisine": "Italian",
        "estimated_cost": 4.00,
    },
    {
        "name": "Lentil Soup",
        "ingredients": ["Red Lentils", "Onion", "Carrot", "Garlic", "Cumin"],
        "tags": ["vegan", "fiber-rich", "budget"],
        "kcal": 320, "protein": 18, "carbs": 50, "fat": 4,
        "prep_time_min": 30, "meal_type": "lunch",
        "source_url": "https://example.com/lentil-soup", "cuisine": "Middle Eastern",
        "estimated_cost": 2.00,
    },
    {
        "name": "Turkey Club Sandwich",
        "ingredients": ["Turkey Breast", "Bread", "Bacon", "Lettuce", "Tomato"],
        "tags": ["classic", "high-protein", "quick"],
        "kcal": 500, "protein": 35, "carbs": 40, "fat": 22,
        "prep_time_min": 10, "meal_type": "lunch",
        "source_url": "https://example.com/turkey-club", "cuisine": "American",
        "estimated_cost": 5.00,
    },
    {
        "name": "Quinoa Buddha Bowl",
        "ingredients": ["Quinoa", "Chickpeas", "Sweet Potato", "Spinach", "Tahini"],
        "tags": ["vegan", "high-fiber", "meal-prep"],
        "kcal": 520, "protein": 20, "carbs": 65, "fat": 18,
        "prep_time_min": 30, "meal_type": "lunch",
        "source_url": "https://example.com/buddha-bowl", "cuisine": "American",
        "estimated_cost": 4.50,
    },
    {
        "name": "Egg Fried Rice",
        "ingredients": ["Rice", "Eggs", "Soy Sauce", "Green Onion", "Sesame Oil"],
        "tags": ["quick", "budget", "asian"],
        "kcal": 450, "protein": 15, "carbs": 60, "fat": 16,
        "prep_time_min": 15, "meal_type": "lunch",
        "source_url": "https://example.com/egg-fried-rice", "cuisine": "Chinese",
        "estimated_cost": 2.50,
    },
    {
        "name": "Greek Salad with Feta",
        "ingredients": ["Cucumber", "Tomato", "Feta Cheese", "Olive Oil", "Red Onion"],
        "tags": ["vegetarian", "low-carb", "fresh"],
        "kcal": 280, "protein": 10, "carbs": 15, "fat": 20,
        "prep_time_min": 10, "meal_type": "lunch",
        "source_url": "https://example.com/greek-salad", "cuisine": "Greek",
        "estimated_cost": 3.50,
    },
    {
        "name": "Black Bean Tacos",
        "ingredients": ["Black Beans", "Tortilla", "Avocado", "Lime", "Cilantro"],
        "tags": ["vegan", "mexican", "quick"],
        "kcal": 400, "protein": 15, "carbs": 55, "fat": 14,
        "prep_time_min": 15, "meal_type": "lunch",
        "source_url": "https://example.com/bean-tacos", "cuisine": "Mexican",
        "estimated_cost": 3.00,
    },
    # ── Dinner ────────────────────────────────────────────────
    {
        "name": "Grilled Salmon with Asparagus",
        "ingredients": ["Salmon Fillet", "Asparagus", "Olive Oil", "Lemon", "Garlic"],
        "tags": ["omega-3", "healthy", "high-protein"],
        "kcal": 480, "protein": 42, "carbs": 8, "fat": 30,
        "prep_time_min": 25, "meal_type": "dinner",
        "source_url": "https://example.com/grilled-salmon", "cuisine": "American",
        "estimated_cost": 8.00,
    },
    {
        "name": "Chicken Stir-Fry",
        "ingredients": ["Chicken Breast", "Broccoli", "Bell Pepper", "Soy Sauce", "Rice"],
        "tags": ["asian", "high-protein", "balanced"],
        "kcal": 520, "protein": 38, "carbs": 50, "fat": 14,
        "prep_time_min": 20, "meal_type": "dinner",
        "source_url": "https://example.com/chicken-stirfry", "cuisine": "Chinese",
        "estimated_cost": 5.00,
    },
    {
        "name": "Spaghetti Bolognese",
        "ingredients": ["Spaghetti", "Ground Beef", "Tomato Sauce", "Onion", "Garlic"],
        "tags": ["classic", "comfort-food", "italian"],
        "kcal": 620, "protein": 32, "carbs": 70, "fat": 22,
        "prep_time_min": 35, "meal_type": "dinner",
        "source_url": "https://example.com/bolognese", "cuisine": "Italian",
        "estimated_cost": 5.50,
    },
    {
        "name": "Beef Tacos",
        "ingredients": ["Ground Beef", "Tortilla", "Cheese", "Lettuce", "Salsa"],
        "tags": ["mexican", "quick", "family"],
        "kcal": 550, "protein": 30, "carbs": 45, "fat": 25,
        "prep_time_min": 20, "meal_type": "dinner",
        "source_url": "https://example.com/beef-tacos", "cuisine": "Mexican",
        "estimated_cost": 4.50,
    },
    {
        "name": "Baked Chicken Thighs with Potatoes",
        "ingredients": ["Chicken Thighs", "Potatoes", "Olive Oil", "Rosemary", "Garlic"],
        "tags": ["comfort-food", "one-pan", "budget"],
        "kcal": 580, "protein": 35, "carbs": 45, "fat": 28,
        "prep_time_min": 45, "meal_type": "dinner",
        "source_url": "https://example.com/baked-chicken", "cuisine": "American",
        "estimated_cost": 4.00,
    },
    {
        "name": "Shrimp Garlic Pasta",
        "ingredients": ["Shrimp", "Spaghetti", "Garlic", "Butter", "Parsley"],
        "tags": ["seafood", "quick", "italian"],
        "kcal": 500, "protein": 30, "carbs": 55, "fat": 18,
        "prep_time_min": 20, "meal_type": "dinner",
        "source_url": "https://example.com/shrimp-pasta", "cuisine": "Italian",
        "estimated_cost": 7.00,
    },
    {
        "name": "Vegetable Curry with Rice",
        "ingredients": ["Chickpeas", "Coconut Milk", "Spinach", "Curry Paste", "Rice"],
        "tags": ["vegan", "spicy", "comfort-food"],
        "kcal": 480, "protein": 16, "carbs": 60, "fat": 18,
        "prep_time_min": 30, "meal_type": "dinner",
        "source_url": "https://example.com/veg-curry", "cuisine": "Indian",
        "estimated_cost": 3.50,
    },
    {
        "name": "Pan-Seared Steak with Salad",
        "ingredients": ["Ribeye Steak", "Mixed Greens", "Olive Oil", "Salt", "Pepper"],
        "tags": ["keto", "high-protein", "low-carb"],
        "kcal": 600, "protein": 45, "carbs": 5, "fat": 45,
        "prep_time_min": 20, "meal_type": "dinner",
        "source_url": "https://example.com/steak-salad", "cuisine": "American",
        "estimated_cost": 10.00,
    },
    {
        "name": "Mushroom Risotto",
        "ingredients": ["Arborio Rice", "Mushrooms", "Parmesan", "Onion", "White Wine"],
        "tags": ["vegetarian", "italian", "comfort-food"],
        "kcal": 520, "protein": 14, "carbs": 65, "fat": 20,
        "prep_time_min": 40, "meal_type": "dinner",
        "source_url": "https://example.com/mushroom-risotto", "cuisine": "Italian",
        "estimated_cost": 5.00,
    },
    {
        "name": "Teriyaki Chicken with Vegetables",
        "ingredients": ["Chicken Breast", "Teriyaki Sauce", "Broccoli", "Carrot", "Rice"],
        "tags": ["asian", "meal-prep", "balanced"],
        "kcal": 540, "protein": 36, "carbs": 55, "fat": 14,
        "prep_time_min": 25, "meal_type": "dinner",
        "source_url": "https://example.com/teriyaki-chicken", "cuisine": "Japanese",
        "estimated_cost": 5.00,
    },
    {
        "name": "Fish and Chips",
        "ingredients": ["Cod Fillet", "Potatoes", "Flour", "Oil", "Lemon"],
        "tags": ["classic", "comfort-food", "british"],
        "kcal": 650, "protein": 30, "carbs": 60, "fat": 30,
        "prep_time_min": 35, "meal_type": "dinner",
        "source_url": "https://example.com/fish-chips", "cuisine": "British",
        "estimated_cost": 6.00,
    },
    {
        "name": "Stuffed Bell Peppers",
        "ingredients": ["Bell Pepper", "Ground Turkey", "Rice", "Tomato Sauce", "Cheese"],
        "tags": ["balanced", "meal-prep", "family"],
        "kcal": 450, "protein": 28, "carbs": 40, "fat": 18,
        "prep_time_min": 40, "meal_type": "dinner",
        "source_url": "https://example.com/stuffed-peppers", "cuisine": "American",
        "estimated_cost": 4.50,
    },
    {
        "name": "Pork Chops with Apple Sauce",
        "ingredients": ["Pork Chops", "Apple", "Butter", "Sage", "Mashed Potatoes"],
        "tags": ["comfort-food", "classic", "autumn"],
        "kcal": 580, "protein": 35, "carbs": 45, "fat": 28,
        "prep_time_min": 30, "meal_type": "dinner",
        "source_url": "https://example.com/pork-chops", "cuisine": "American",
        "estimated_cost": 6.00,
    },
    {
        "name": "Thai Green Curry",
        "ingredients": ["Chicken Breast", "Coconut Milk", "Green Curry Paste", "Bamboo Shoots", "Rice"],
        "tags": ["spicy", "asian", "gluten-free"],
        "kcal": 530, "protein": 32, "carbs": 50, "fat": 22,
        "prep_time_min": 25, "meal_type": "dinner",
        "source_url": "https://example.com/thai-green-curry", "cuisine": "Thai",
        "estimated_cost": 5.50,
    },
    {
        "name": "Margherita Pizza (Homemade)",
        "ingredients": ["Pizza Dough", "Mozzarella", "Tomato Sauce", "Basil", "Olive Oil"],
        "tags": ["vegetarian", "italian", "family"],
        "kcal": 600, "protein": 22, "carbs": 70, "fat": 24,
        "prep_time_min": 30, "meal_type": "dinner",
        "source_url": "https://example.com/margherita-pizza", "cuisine": "Italian",
        "estimated_cost": 4.00,
    },
]


if __name__ == "__main__":
    logger.info(f"Starting ingestion of {len(SEED_RECIPES)} recipes...")
    ingest_recipes(SEED_RECIPES)
    logger.info("Done!")
