"""Pydantic models for the /api/flex-profile endpoints."""

from typing import Optional

from pydantic import BaseModel


class FlexProfileResponse(BaseModel):
    user_id: str
    display_name: Optional[str] = None
    life_score: Optional[str] = None
    life_score_summary: Optional[str] = None
    streaks: Optional[dict] = None
    badges: list[str] = []
    active_workout_split: Optional[str] = None
    current_recipe_plan: Optional[str] = None
    can_steal_workout: bool = False
    can_steal_recipes: bool = False
