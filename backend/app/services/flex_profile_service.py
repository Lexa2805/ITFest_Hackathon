"""
Flex Profile service — aggregates a friend's profile data into an
interactive view with Life Score, streaks, workout split, recipes,
and steal-ability flags.
"""

from __future__ import annotations

import logging

from app.schemas.flex_profile import FlexProfileResponse
from app.services.life_score_service import get_latest_life_score
from app.services.profile_service import get_profile
from app.services.recipe_service import get_user_recipes
from app.services.streak_service import get_streaks

logger = logging.getLogger(__name__)


async def get_flex_profile(friend_user_id: str) -> FlexProfileResponse:
    """Build a Flex Profile for a given user, aggregating data from multiple services."""

    # Profile basics
    profile = await get_profile(friend_user_id)
    display_name = profile.get("name") if profile else None

    # Life Score (null-safe)
    life_score_str: str | None = None
    life_score_summary: str | None = None
    try:
        ls = await get_latest_life_score(friend_user_id)
        if ls:
            life_score_str = ls.score
            life_score_summary = ls.summary
    except Exception:
        logger.debug("No life score for user %s", friend_user_id)

    # Streaks
    streaks_dict: dict | None = None
    try:
        streak_resp = await get_streaks(friend_user_id, timezone="UTC")
        streaks_dict = streak_resp.model_dump()
    except Exception:
        logger.debug("No streaks for user %s", friend_user_id)

    # Active workout split name
    active_workout_split: str | None = None
    can_steal_workout = False
    if profile and profile.get("available_days_per_week"):
        try:
            from app.services.workout_split_service import generate_split
            from app.schemas.profile import ProfileResponse

            profile_obj = ProfileResponse(**profile)
            split = generate_split(profile_obj)
            active_workout_split = split.get("split_type")
            can_steal_workout = True
        except Exception:
            logger.debug("No workout split for user %s", friend_user_id)

    # Latest recipe plan
    current_recipe_plan: str | None = None
    can_steal_recipes = False
    try:
        recipes = await get_user_recipes(friend_user_id, limit=1)
        if recipes:
            current_recipe_plan = recipes[0].name
            can_steal_recipes = True
    except Exception:
        logger.debug("No recipes for user %s", friend_user_id)

    return FlexProfileResponse(
        user_id=friend_user_id,
        display_name=display_name,
        life_score=life_score_str,
        life_score_summary=life_score_summary,
        streaks=streaks_dict,
        badges=[],  # badges system not yet implemented
        active_workout_split=active_workout_split,
        current_recipe_plan=current_recipe_plan,
        can_steal_workout=can_steal_workout,
        can_steal_recipes=can_steal_recipes,
    )
