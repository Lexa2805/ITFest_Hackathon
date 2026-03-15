"""Service helpers for user profile CRUD in Supabase."""

from __future__ import annotations

from datetime import datetime, timezone

from app.schemas.profile import ProfileUpsertRequest
from app.services import calorie_calculator
from app.services.supabase_client import get_supabase


async def upsert_profile(user_id: str, profile: ProfileUpsertRequest) -> dict:
    """Create or update profile data for a user with upsert semantics."""
    supabase = await get_supabase()

    calorie_inputs_ready = all(
        value is not None
        for value in (profile.weight, profile.height, profile.age, profile.activity_level, profile.goal)
    )
    can_calculate_targets = calorie_inputs_ready and profile.gender in {"male", "female"}

    target_payload: dict[str, int | None] = {}
    if can_calculate_targets:
        targets = await calorie_calculator.calculate_daily_targets(
            weight=float(profile.weight),
            height=float(profile.height),
            age=int(profile.age),
            gender=str(profile.gender),
            activity_level=str(profile.activity_level),
            goal=str(profile.goal),
        )
        target_payload = {
            "daily_kcal_target": targets.daily_kcal_target,
            "protein_target_g": targets.protein_g,
            "fat_target_g": targets.fat_g,
            "carbs_target_g": targets.carbs_g,
        }
    elif calorie_inputs_ready:
        target_payload = {
            "daily_kcal_target": None,
            "protein_target_g": None,
            "fat_target_g": None,
            "carbs_target_g": None,
        }

    payload = {
        "user_id": user_id,
        "name": profile.name,
        "email": profile.email,
        "weight": profile.weight,
        "height": profile.height,
        "age": profile.age,
        "gender": profile.gender,
        "activity_level": profile.activity_level,
        "goal": profile.goal,
        "experience_level": profile.experience_level,
        "available_days_per_week": profile.available_days_per_week,
        "has_apple_watch": profile.has_apple_watch,
        "is_profile_public": profile.is_profile_public,
        "weekly_budget": profile.weekly_budget,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        **target_payload,
    }

    try:
        result = await supabase.table("profiles").upsert(payload, on_conflict="user_id").execute()
    except Exception as exc:
        error_message = str(exc)
        if "is_profile_public" not in error_message:
            raise

        fallback_payload = {k: v for k, v in payload.items() if k != "is_profile_public"}
        result = await (
            supabase.table("profiles")
            .upsert(fallback_payload, on_conflict="user_id")
            .execute()
        )
    if result.data:
        return result.data[0]

    fallback = await (
        supabase.table("profiles")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if fallback.data:
        return fallback.data[0]

    raise Exception("Failed to create or update profile")


async def get_profile(user_id: str) -> dict | None:
    """Fetch profile for a user; return None if no profile exists."""
    supabase = await get_supabase()
    result = await supabase.table("profiles").select("*").eq("user_id", user_id).limit(1).execute()
    if not result.data:
        return None
    return result.data[0]
