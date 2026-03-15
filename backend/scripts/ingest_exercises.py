import os
import sys
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


def build_chunk_text(exercise: Dict[str, Any]) -> str:
    """Concatenate exercise fields into a single text chunk for embedding."""
    parts = [exercise["name"], exercise["target_muscle"]]
    equipment = exercise.get("equipment", [])
    if equipment:
        parts.append("Equipment: " + ", ".join(equipment))
    steps = exercise.get("execution_steps", [])
    if steps:
        parts.append("Steps: " + " ".join(steps))
    return " ".join(parts)


def get_embedding(text: str) -> List[float]:
    """Generates embeddings using OpenRouter API (ada-002)."""
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


def ingest_exercises(exercises: List[Dict[str, Any]]):
    """Ingests exercise data into the exercise_embeddings table."""
    for i, exercise in enumerate(exercises, 1):
        # Skip exercises missing required fields
        if not exercise.get("name") or not exercise.get("target_muscle"):
            logger.warning(
                f"Skipping exercise missing required fields: {exercise.get('source_id', 'unknown')}"
            )
            continue

        try:
            chunk_text = build_chunk_text(exercise)
            embedding = get_embedding(chunk_text)

            metadata = {
                "target_muscle": exercise["target_muscle"],
                "equipment": exercise.get("equipment", []),
                "execution_steps": exercise.get("execution_steps", []),
                "image_url": exercise.get("image_url"),
                "difficulty": exercise.get("difficulty", "intermediate"),
                "source_url": exercise.get("source_url"),
            }

            data = {
                "source_id": exercise["source_id"],
                "name": exercise["name"],
                "embedding": embedding,
                "metadata": metadata,
            }

            logger.info(f"[{i}/{len(exercises)}] Ingesting: {exercise['name']}")
            supabase.table("exercise_embeddings").upsert(
                data, on_conflict="source_id"
            ).execute()

        except Exception as e:
            logger.error(f"Error ingesting {exercise.get('name', '?')}: {e}")


# ---------------------------------------------------------------------------
# Seed dataset — 18 diverse exercises across muscle groups and difficulties
# ---------------------------------------------------------------------------
SEED_EXERCISES: List[Dict[str, Any]] = [
    # ── Chest ─────────────────────────────────────────────────
    {
        "source_id": "ex-barbell-bench-press",
        "name": "Barbell Bench Press",
        "target_muscle": "chest",
        "equipment": ["barbell", "flat bench"],
        "execution_steps": [
            "Lie flat on the bench with eyes under the bar.",
            "Grip the bar slightly wider than shoulder width.",
            "Unrack and lower the bar to mid-chest.",
            "Press the bar up until arms are fully extended.",
        ],
        "difficulty": "intermediate",
        "image_url": "https://example.com/images/bench-press.gif",
        "source_url": "https://example.com/exercises/bench-press",
    },
    {
        "source_id": "ex-push-up",
        "name": "Push-Up",
        "target_muscle": "chest",
        "equipment": [],
        "execution_steps": [
            "Start in a high plank position with hands shoulder-width apart.",
            "Lower your body until your chest nearly touches the floor.",
            "Push back up to the starting position.",
        ],
        "difficulty": "beginner",
        "image_url": "https://example.com/images/push-up.gif",
        "source_url": "https://example.com/exercises/push-up",
    },
    # ── Back ──────────────────────────────────────────────────
    {
        "source_id": "ex-pull-up",
        "name": "Pull-Up",
        "target_muscle": "back",
        "equipment": ["pull-up bar"],
        "execution_steps": [
            "Hang from the bar with an overhand grip, hands shoulder-width apart.",
            "Pull yourself up until your chin clears the bar.",
            "Lower yourself back down with control.",
        ],
        "difficulty": "intermediate",
        "image_url": "https://example.com/images/pull-up.gif",
        "source_url": "https://example.com/exercises/pull-up",
    },
    {
        "source_id": "ex-barbell-row",
        "name": "Barbell Bent-Over Row",
        "target_muscle": "back",
        "equipment": ["barbell"],
        "execution_steps": [
            "Stand with feet hip-width apart, hinge at the hips.",
            "Grip the barbell with an overhand grip.",
            "Pull the bar toward your lower chest, squeezing shoulder blades.",
            "Lower the bar back down with control.",
        ],
        "difficulty": "intermediate",
        "image_url": "https://example.com/images/barbell-row.gif",
        "source_url": "https://example.com/exercises/barbell-row",
    },
    # ── Legs ──────────────────────────────────────────────────
    {
        "source_id": "ex-barbell-back-squat",
        "name": "Barbell Back Squat",
        "target_muscle": "legs",
        "equipment": ["barbell", "squat rack"],
        "execution_steps": [
            "Step under the bar and position it on your upper traps.",
            "Unrack and step back with feet shoulder-width apart.",
            "Squat down until thighs are parallel to the floor.",
            "Drive through your heels to stand back up.",
        ],
        "difficulty": "intermediate",
        "image_url": "https://example.com/images/back-squat.gif",
        "source_url": "https://example.com/exercises/back-squat",
    },
    {
        "source_id": "ex-bodyweight-lunge",
        "name": "Bodyweight Walking Lunge",
        "target_muscle": "legs",
        "equipment": [],
        "execution_steps": [
            "Stand tall with feet together.",
            "Step forward with one leg and lower your hips until both knees are at 90 degrees.",
            "Push off the front foot and step the back foot forward into the next lunge.",
        ],
        "difficulty": "beginner",
        "image_url": "https://example.com/images/walking-lunge.gif",
        "source_url": "https://example.com/exercises/walking-lunge",
    },
    {
        "source_id": "ex-romanian-deadlift",
        "name": "Romanian Deadlift",
        "target_muscle": "legs",
        "equipment": ["barbell"],
        "execution_steps": [
            "Hold the barbell at hip height with an overhand grip.",
            "Hinge at the hips, pushing them back while keeping a slight knee bend.",
            "Lower the bar along your shins until you feel a hamstring stretch.",
            "Drive hips forward to return to standing.",
        ],
        "difficulty": "intermediate",
        "image_url": "https://example.com/images/romanian-deadlift.gif",
        "source_url": "https://example.com/exercises/romanian-deadlift",
    },
    # ── Shoulders ───────────────────────────────────────────────
    {
        "source_id": "ex-overhead-press",
        "name": "Barbell Overhead Press",
        "target_muscle": "shoulders",
        "equipment": ["barbell"],
        "execution_steps": [
            "Stand with feet shoulder-width apart, bar at collarbone height.",
            "Press the bar overhead until arms are fully locked out.",
            "Lower the bar back to collarbone height with control.",
        ],
        "difficulty": "intermediate",
        "image_url": "https://example.com/images/overhead-press.gif",
        "source_url": "https://example.com/exercises/overhead-press",
    },
    {
        "source_id": "ex-lateral-raise",
        "name": "Dumbbell Lateral Raise",
        "target_muscle": "shoulders",
        "equipment": ["dumbbells"],
        "execution_steps": [
            "Stand with dumbbells at your sides, palms facing in.",
            "Raise both arms out to the sides until parallel with the floor.",
            "Lower back down slowly.",
        ],
        "difficulty": "beginner",
        "image_url": "https://example.com/images/lateral-raise.gif",
        "source_url": "https://example.com/exercises/lateral-raise",
    },
    # ── Arms ──────────────────────────────────────────────────
    {
        "source_id": "ex-barbell-curl",
        "name": "Barbell Bicep Curl",
        "target_muscle": "arms",
        "equipment": ["barbell"],
        "execution_steps": [
            "Stand with feet hip-width apart, grip the barbell underhand.",
            "Curl the bar up toward your shoulders, keeping elbows pinned.",
            "Lower the bar back down with control.",
        ],
        "difficulty": "beginner",
        "image_url": "https://example.com/images/barbell-curl.gif",
        "source_url": "https://example.com/exercises/barbell-curl",
    },
    {
        "source_id": "ex-tricep-dip",
        "name": "Tricep Dip",
        "target_muscle": "arms",
        "equipment": ["parallel bars"],
        "execution_steps": [
            "Grip the parallel bars and lift yourself up with arms straight.",
            "Lower your body by bending elbows to about 90 degrees.",
            "Press back up to the starting position.",
        ],
        "difficulty": "intermediate",
        "image_url": "https://example.com/images/tricep-dip.gif",
        "source_url": "https://example.com/exercises/tricep-dip",
    },
    # ── Core ──────────────────────────────────────────────────
    {
        "source_id": "ex-plank",
        "name": "Plank",
        "target_muscle": "core",
        "equipment": [],
        "execution_steps": [
            "Start in a forearm plank position, elbows under shoulders.",
            "Keep your body in a straight line from head to heels.",
            "Hold the position, engaging your core throughout.",
        ],
        "difficulty": "beginner",
        "image_url": "https://example.com/images/plank.gif",
        "source_url": "https://example.com/exercises/plank",
    },
    {
        "source_id": "ex-hanging-leg-raise",
        "name": "Hanging Leg Raise",
        "target_muscle": "core",
        "equipment": ["pull-up bar"],
        "execution_steps": [
            "Hang from a pull-up bar with arms fully extended.",
            "Raise your legs until they are parallel to the floor.",
            "Lower them back down slowly without swinging.",
        ],
        "difficulty": "advanced",
        "image_url": "https://example.com/images/hanging-leg-raise.gif",
        "source_url": "https://example.com/exercises/hanging-leg-raise",
    },
    # ── Full Body / Compound ──────────────────────────────────
    {
        "source_id": "ex-deadlift",
        "name": "Conventional Deadlift",
        "target_muscle": "full body",
        "equipment": ["barbell"],
        "execution_steps": [
            "Stand with feet hip-width apart, bar over mid-foot.",
            "Hinge at hips and grip the bar just outside your knees.",
            "Brace your core and lift by driving through your heels.",
            "Stand tall, then reverse the movement to lower the bar.",
        ],
        "difficulty": "advanced",
        "image_url": "https://example.com/images/deadlift.gif",
        "source_url": "https://example.com/exercises/deadlift",
    },
    {
        "source_id": "ex-burpee",
        "name": "Burpee",
        "target_muscle": "full body",
        "equipment": [],
        "execution_steps": [
            "Stand with feet shoulder-width apart.",
            "Drop into a squat and place hands on the floor.",
            "Jump your feet back into a plank, perform a push-up.",
            "Jump feet forward to hands and explode upward.",
        ],
        "difficulty": "intermediate",
        "image_url": "https://example.com/images/burpee.gif",
        "source_url": "https://example.com/exercises/burpee",
    },
    {
        "source_id": "ex-kettlebell-swing",
        "name": "Kettlebell Swing",
        "target_muscle": "full body",
        "equipment": ["kettlebell"],
        "execution_steps": [
            "Stand with feet wider than shoulder-width, kettlebell on the floor.",
            "Hinge at hips, grip the kettlebell with both hands.",
            "Swing the kettlebell back between your legs.",
            "Drive hips forward to swing the kettlebell to chest height.",
        ],
        "difficulty": "intermediate",
        "image_url": "https://example.com/images/kettlebell-swing.gif",
        "source_url": "https://example.com/exercises/kettlebell-swing",
    },
    # ── Glutes ────────────────────────────────────────────────
    {
        "source_id": "ex-hip-thrust",
        "name": "Barbell Hip Thrust",
        "target_muscle": "glutes",
        "equipment": ["barbell", "bench"],
        "execution_steps": [
            "Sit on the floor with upper back against a bench, barbell over hips.",
            "Drive through your heels to lift hips until body forms a straight line.",
            "Squeeze glutes at the top, then lower back down.",
        ],
        "difficulty": "intermediate",
        "image_url": "https://example.com/images/hip-thrust.gif",
        "source_url": "https://example.com/exercises/hip-thrust",
    },
    {
        "source_id": "ex-glute-bridge",
        "name": "Glute Bridge",
        "target_muscle": "glutes",
        "equipment": [],
        "execution_steps": [
            "Lie on your back with knees bent and feet flat on the floor.",
            "Push through your heels to lift hips toward the ceiling.",
            "Squeeze glutes at the top, then lower back down.",
        ],
        "difficulty": "beginner",
        "image_url": "https://example.com/images/glute-bridge.gif",
        "source_url": "https://example.com/exercises/glute-bridge",
    },
]


if __name__ == "__main__":
    logger.info(f"Starting ingestion of {len(SEED_EXERCISES)} exercises...")
    ingest_exercises(SEED_EXERCISES)
    logger.info("Done!")
