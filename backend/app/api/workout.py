from datetime import date
import logging
from typing import List
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.fridge import get_current_user_id
from app.schemas.workout import (
    WorkoutPlanResponse,
    WorkoutCompletionCreate,
    WorkoutCompletionResponse,
    ExerciseResponse,
    ExerciseRecommendationResponse,
)
from app.schemas.profile import ProfileResponse
from app.services.profile_service import get_profile
from app.services.workout_service import (
    create_workout_plan,
    get_latest_workout_plan,
    mark_workout_complete,
    remove_workout_completion,
    get_exercise_by_id,
    list_workout_completions,
)
from app.services.workout_rag_service import WorkoutRAGService
from app.services.workout_split_service import generate_split
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/workout", tags=["workout"])
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_latest_physical_state_score(user_id: str) -> int:
    """Fetch the most recent physical_state_score from daily_checkins, default 70."""
    try:
        sb = await get_supabase()
        result = await (
            sb.table("daily_checkins")
            .select("physical_state_score")
            .eq("user_id", user_id)
            .order("date", desc=True)
            .limit(1)
            .execute()
        )
        if result.data and result.data[0].get("physical_state_score") is not None:
            return int(result.data[0]["physical_state_score"])
    except Exception:
        logger.warning("Could not fetch physical_state_score for user %s, using default", user_id)
    return 70


# ---------------------------------------------------------------------------
# Recommendations (RAG)
# ---------------------------------------------------------------------------

@router.get("/recommendations", response_model=list[ExerciseRecommendationResponse])
async def get_workout_recommendations(
    muscle_group: str | None = None,
    limit: int = Query(default=10, ge=1, le=20),
    difficulty: str | None = None,
    user_id: str = Depends(get_current_user_id),
) -> list[ExerciseRecommendationResponse]:
    """Return personalised exercise recommendations via RAG."""
    # 1. Fetch user profile
    profile_data = await get_profile(user_id)
    if not profile_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile not found. Please complete your profile first.",
        )

    # 2. Validate required fields
    missing: list[str] = []
    if not profile_data.get("experience_level"):
        missing.append("experience_level")
    if not profile_data.get("goal"):
        missing.append("goal")
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Profile is missing required fields: {', '.join(missing)}",
        )

    # 3. Physical state score
    physical_state_score = await _get_latest_physical_state_score(user_id)

    # 4. RAG recommendations
    rag_service = WorkoutRAGService()
    return await rag_service.get_recommendations(
        user_profile=profile_data,
        physical_state_score=physical_state_score,
        muscle_group=muscle_group,
        difficulty=difficulty,
        limit=limit,
    )


class GenerateWorkoutRequest(BaseModel):
    force_regenerate: bool = False
    preferred_split: Literal["full_body", "upper_lower", "push_pull_legs"] | None = None
    day_states: dict[int, Literal["gym", "rest", "recovery"]] | None = None


@router.post("/generate", response_model=WorkoutPlanResponse)
async def generate_workout_plan_endpoint(
    request: GenerateWorkoutRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Generate a new workout plan based on user profile."""
    try:
        # 1. Fetch user profile
        profile_data = await get_profile(user_id)
        if not profile_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found. Please complete your profile first."
            )

        profile = ProfileResponse(**profile_data)

        # 2. Check required fields
        if not profile.available_days_per_week:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile is missing 'available_days_per_week'. Please update your profile."
            )

        if not profile.experience_level:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile is missing 'experience_level'. Please update your profile."
            )

        if not profile.goal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile is missing 'goal'. Please update your profile."
            )

        # 3. Check for existing plan if not forcing regeneration
        if not request.force_regenerate:
            latest_plan = get_latest_workout_plan(user_id)
            if latest_plan:
                return latest_plan

        # 4. Generate split
        split_result = generate_split(
            profile,
            preferred_split=request.preferred_split,
            day_states=request.day_states,
        )

        from app.schemas.workout import WorkoutPlanCreate

        plan_create = WorkoutPlanCreate(
            week_start_date=date.today(),
            split_type=split_result["split_type"],
            daily_workouts=split_result["daily_workouts"],
        )

        # 5. Persist and return
        result = create_workout_plan(user_id, plan_create)
        return result
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error while generating workout plan", extra={"user_id": user_id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate workout plan. Please try again."
        ) from exc


@router.get("/plan/{user_id}", response_model=WorkoutPlanResponse)
async def get_workout_plan_endpoint(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """Get the latest workout plan for a user."""
    if user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own workout plan."
        )
    
    try:
        plan = get_latest_workout_plan(user_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workout plan not found"
            )
        return plan
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error while loading workout plan", extra={"user_id": user_id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load workout plan."
        ) from exc


@router.post("/complete", response_model=WorkoutCompletionResponse)
async def mark_workout_complete_endpoint(
    completion: WorkoutCompletionCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Mark a workout day as complete."""
    try:
        return mark_workout_complete(user_id, completion)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error while marking workout complete", extra={"user_id": user_id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark workout completion."
        ) from exc


@router.delete("/complete", status_code=status.HTTP_204_NO_CONTENT)
async def remove_workout_completion_endpoint(
    workout_plan_id: str,
    date: date,
    day_of_week: int,
    exercise_id: str | None = None,
    user_id: str = Depends(get_current_user_id),
):
    """Undo a workout completion (day-level or exercise-level)."""
    try:
        was_removed = remove_workout_completion(
            user_id=user_id,
            workout_plan_id=workout_plan_id,
            completion_date=date.isoformat(),
            day_of_week=day_of_week,
            exercise_id=exercise_id,
        )

        if not was_removed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workout completion not found.",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error while removing workout completion", extra={"user_id": user_id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove workout completion.",
        ) from exc


@router.get("/exercises/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise_endpoint(
    exercise_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get exercise details."""
    del user_id
    try:
        exercise = get_exercise_by_id(exercise_id)
        if not exercise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exercise not found"
            )
        return exercise
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error while loading exercise", extra={"exercise_id": exercise_id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load exercise details."
        ) from exc


@router.get("/completions/{workout_plan_id}", response_model=List[WorkoutCompletionResponse])
async def get_workout_completions_endpoint(
    workout_plan_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get completion records for a workout plan."""
    try:
        return list_workout_completions(user_id, workout_plan_id)
    except Exception as exc:
        logger.exception(
            "Unexpected error while loading workout completions",
            extra={"user_id": user_id, "workout_plan_id": workout_plan_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load workout completions."
        ) from exc
