import logging
from typing import List, Optional

from app.schemas.workout import (
    WorkoutPlanCreate,
    WorkoutPlanResponse,
    WorkoutCompletionCreate,
    WorkoutCompletionResponse,
    ExerciseResponse
)
from app.services.supabase_client import get_supabase_client

supabase = get_supabase_client()
logger = logging.getLogger(__name__)


def _first_row_or_none(response) -> dict | None:
    data = getattr(response, "data", None)
    if not data:
        return None
    return data[0]

def create_workout_plan(user_id: str, plan: WorkoutPlanCreate) -> WorkoutPlanResponse:
    """Create a new workout plan for a user."""
    # Convert daily_workouts to dict for JSONB storage
    daily_workouts_data = [day.model_dump(mode="json") for day in plan.daily_workouts]
    
    try:
        response = supabase.table("workout_plans").insert({
            "user_id": str(user_id),
            "week_start_date": plan.week_start_date.isoformat(),
            "split_type": plan.split_type,
            "daily_workouts": daily_workouts_data
        }).execute()
    except Exception as exc:
        logger.exception("Failed to insert workout plan", extra={"user_id": str(user_id)})
        raise RuntimeError("Database error while creating workout plan") from exc

    row = _first_row_or_none(response)
    if not row:
        try:
            # Fallback in case insert returns empty data
            response = (
                supabase
                .table("workout_plans")
                .select("*")
                .eq("user_id", str(user_id))
                .eq("week_start_date", plan.week_start_date.isoformat())
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            row = _first_row_or_none(response)
        except Exception as exc:
            logger.exception("Failed to load created workout plan fallback", extra={"user_id": str(user_id)})
            raise RuntimeError("Database error while loading created workout plan") from exc

    if not row:
        raise RuntimeError("Workout plan was not persisted")

    return WorkoutPlanResponse(**row)

def get_workout_plan(user_id: str, week_start_date: str) -> Optional[WorkoutPlanResponse]:
    """Retrieve a workout plan for a specific week."""
    response = supabase.table("workout_plans").select("*").eq("user_id", str(user_id)).eq("week_start_date", week_start_date).execute()

    row = _first_row_or_none(response)
    if not row:
        return None

    return WorkoutPlanResponse(**row)

def get_latest_workout_plan(user_id: str) -> Optional[WorkoutPlanResponse]:
    """Fetch the most recent workout plan for a user."""
    response = supabase.table("workout_plans").select("*").eq("user_id", str(user_id)).order("week_start_date", desc=True).limit(1).execute()

    row = _first_row_or_none(response)
    if not row:
        return None

    return WorkoutPlanResponse(**row)

def mark_workout_complete(user_id: str, completion: WorkoutCompletionCreate) -> WorkoutCompletionResponse:
    """Record a workout completion."""
    payload: dict[str, str | int | None] = {
        "user_id": str(user_id),
        "workout_plan_id": str(completion.workout_plan_id),
        "date": completion.date.isoformat(),
        "day_of_week": completion.day_of_week,
    }
    if completion.exercise_id:
        payload["exercise_id"] = str(completion.exercise_id)

    response = None
    try:
        response = supabase.table("workout_completions").insert(payload).execute()
    except Exception as exc:
        logger.warning(
            "Primary completion insert failed, trying compatibility fallback",
            extra={"user_id": str(user_id), "error": str(exc)},
        )

        legacy_payload = {
            "user_id": str(user_id),
            "workout_plan_id": str(completion.workout_plan_id),
            "date": completion.date.isoformat(),
            "day_of_week": completion.day_of_week,
        }
        try:
            response = supabase.table("workout_completions").insert(legacy_payload).execute()
        except Exception as legacy_exc:
            logger.exception(
                "Legacy completion insert also failed",
                extra={"user_id": str(user_id), "error": str(legacy_exc)},
            )
            response = None

    row = _first_row_or_none(response) if response else None
    if not row:
        try:
            fallback_query = (
                supabase
                .table("workout_completions")
                .select("*")
                .eq("user_id", str(user_id))
                .eq("workout_plan_id", str(completion.workout_plan_id))
                .eq("date", completion.date.isoformat())
                .eq("day_of_week", completion.day_of_week)
            )

            if completion.exercise_id:
                try:
                    fallback_query = fallback_query.eq("exercise_id", str(completion.exercise_id))
                except Exception:
                    pass

            response = fallback_query.order("completed_at", desc=True).limit(1).execute()
            row = _first_row_or_none(response)
        except Exception as exc:
            logger.exception(
                "Failed to resolve fallback completion record",
                extra={"user_id": str(user_id), "workout_plan_id": str(completion.workout_plan_id)},
            )
            raise RuntimeError("Database error while saving workout completion") from exc

    if not row:
        raise RuntimeError("Workout completion was not persisted")

    return WorkoutCompletionResponse(**row)


def remove_workout_completion(
    user_id: str,
    workout_plan_id: str,
    completion_date: str,
    day_of_week: int,
    exercise_id: str | None = None,
) -> bool:
    """Remove a workout completion record. Returns True when a record was deleted."""
    supports_exercise_id = True
    try:
        lookup_response = (
            supabase
            .table("workout_completions")
            .select("id, exercise_id")
            .eq("user_id", str(user_id))
            .eq("workout_plan_id", str(workout_plan_id))
            .eq("date", completion_date)
            .eq("day_of_week", day_of_week)
            .order("completed_at", desc=True)
            .execute()
        )
    except Exception as exc:
        supports_exercise_id = False
        logger.warning(
            "Lookup with exercise_id failed, trying legacy removal path",
            extra={"user_id": str(user_id), "workout_plan_id": str(workout_plan_id), "error": str(exc)},
        )
        try:
            lookup_response = (
                supabase
                .table("workout_completions")
                .select("id")
                .eq("user_id", str(user_id))
                .eq("workout_plan_id", str(workout_plan_id))
                .eq("date", completion_date)
                .eq("day_of_week", day_of_week)
                .order("completed_at", desc=True)
                .execute()
            )
        except Exception as legacy_exc:
            logger.exception(
                "Failed to load workout completion for removal",
                extra={"user_id": str(user_id), "workout_plan_id": str(workout_plan_id)},
            )
            raise RuntimeError("Database error while loading workout completion") from legacy_exc

    rows = getattr(lookup_response, "data", None) or []
    target_row = None

    if supports_exercise_id:
        for row in rows:
            row_exercise_id = row.get("exercise_id")
            if exercise_id is None and row_exercise_id is None:
                target_row = row
                break
            if exercise_id is not None and str(row_exercise_id) == str(exercise_id):
                target_row = row
                break
    else:
        target_row = rows[0] if rows else None

    if not target_row:
        return False

    try:
        (
            supabase
            .table("workout_completions")
            .delete()
            .eq("id", target_row["id"])
            .execute()
        )
    except Exception as exc:
        logger.exception(
            "Failed to remove workout completion",
            extra={"user_id": str(user_id), "workout_plan_id": str(workout_plan_id), "completion_id": target_row.get("id")},
        )
        raise RuntimeError("Database error while removing workout completion") from exc

    return True

def get_weekly_completions(user_id: str, week_start_date: str) -> int:
    """Retrieve the number of completions for a week."""
    # Getting start and end dates limits
    # Assuming start date provided to this function
    response = supabase.table("workout_completions") \
        .select("id", count="exact") \
        .eq("user_id", str(user_id)) \
        .gte("date", week_start_date) \
        .execute()
    
    return response.count if response.count is not None else 0


def list_workout_completions(user_id: str, workout_plan_id: str) -> List[WorkoutCompletionResponse]:
    """Retrieve completion records for a workout plan."""
    response = (
        supabase
        .table("workout_completions")
        .select("*")
        .eq("user_id", str(user_id))
        .eq("workout_plan_id", str(workout_plan_id))
        .order("date", desc=False)
        .execute()
    )

    if not response.data:
        return []

    return [WorkoutCompletionResponse(**item) for item in response.data]

def get_exercise_by_id(exercise_id: str) -> Optional[ExerciseResponse]:
    """Retrieve exercise details by ID."""
    response = supabase.table("exercises").select("*").eq("id", str(exercise_id)).execute()

    row = _first_row_or_none(response)
    if not row:
        return None

    return ExerciseResponse(**row)

def get_exercises_by_muscle_group(muscle_group: str, difficulty: str) -> List[ExerciseResponse]:
    """Retrieve exercises filtered by muscle group and difficulty."""
    try:
        response = supabase.table("exercises").select("*").eq("muscle_group", muscle_group).eq("difficulty", difficulty).execute()
    except Exception:
        return []

    if not response.data:
        return []

    return [ExerciseResponse(**exercise) for exercise in response.data]
