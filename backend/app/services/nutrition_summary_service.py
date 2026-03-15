"""Timezone-aware daily nutrition summary for the dashboard."""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone, tzinfo
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from postgrest.exceptions import APIError

from app.schemas.nutrition import MacroSummary, NutritionDailySummaryResponse
from app.services.supabase_client import get_supabase

logger = logging.getLogger(__name__)

MEAL_LOGS_TABLE = "meal_logs"
PROFILES_TABLE = "profiles"

# Defaults when the user has no targets configured
_DEFAULT_KCAL = 2000
_DEFAULT_PROTEIN = 130
_DEFAULT_FAT = 70
_DEFAULT_CARBS = 220
_DEFAULT_WATER = 2000


def _resolve_tz(timezone_str: str) -> tzinfo:
    """Return a ZoneInfo for *timezone_str*, falling back to UTC."""
    try:
        return ZoneInfo(timezone_str)
    except (ZoneInfoNotFoundError, KeyError):
        logger.warning(
            "Unknown timezone '%s' or missing tzdata, falling back to UTC",
            timezone_str,
        )
        return timezone.utc


def _local_today(tz: tzinfo) -> date:
    """Current calendar date in the given timezone."""
    return datetime.now(tz).date()


def _calc_status(consumed: int, target: int) -> str:
    """Classify daily intake relative to calorie target."""
    if target <= 0:
        return "On track"
    if consumed > target * 1.1:
        return "Over eating"
    if consumed < target * 0.5:
        return "Under eating"
    return "On track"


async def _fetch_meals(user_id: str, local_today: date) -> list[dict]:
    """Return meal_logs rows for *user_id* on *local_today*, or [] on error."""
    supabase = await get_supabase()
    try:
        result = await (
            supabase.table(MEAL_LOGS_TABLE)
            .select("*")
            .eq("user_id", user_id)
            .eq("date", local_today.isoformat())
            .order("created_at")
            .execute()
        )
        return result.data or []
    except APIError as exc:
        logger.warning("meal_logs query failed, returning empty: %s", exc)
        return []


async def _fetch_targets(user_id: str) -> dict:
    """Return profile nutrition targets, falling back to defaults."""
    supabase = await get_supabase()
    try:
        result = await (
            supabase.table(PROFILES_TABLE)
            .select("daily_kcal_target, protein_target_g, fat_target_g, carbs_target_g")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else {}
    except APIError as exc:
        logger.warning("profiles query failed, using defaults: %s", exc)
        return {}


async def get_daily_summary(
    user_id: str,
    timezone_str: str = "UTC",
) -> NutritionDailySummaryResponse:
    """Build a timezone-aware daily nutrition summary for the dashboard."""
    tz = _resolve_tz(timezone_str)
    today = _local_today(tz)

    meals_raw = await _fetch_meals(user_id, today)

    # Aggregate consumed totals
    total_kcal = sum(int(m.get("kcal", 0)) for m in meals_raw)
    total_protein = sum(int(m.get("protein", 0)) for m in meals_raw)
    total_fat = sum(int(m.get("fat", 0)) for m in meals_raw)
    total_carbs = sum(int(m.get("carbs", 0)) for m in meals_raw)

    # Targets from profile (with defaults)
    targets = await _fetch_targets(user_id)
    kcal_target = int(targets.get("daily_kcal_target") or _DEFAULT_KCAL)
    protein_target = int(targets.get("protein_target_g") or _DEFAULT_PROTEIN)
    fat_target = int(targets.get("fat_target_g") or _DEFAULT_FAT)
    carbs_target = int(targets.get("carbs_target_g") or _DEFAULT_CARBS)

    # Water — no dedicated column yet, use a sensible default
    water_consumed = 0  # placeholder until water logging is implemented
    water_target = _DEFAULT_WATER

    remaining_kcal = kcal_target - total_kcal
    status = _calc_status(total_kcal, kcal_target)

    # Lightweight meal dicts for the response (avoid full MealLogResponse)
    meals_light = [
        {
            "id": m.get("id"),
            "meal_name": m.get("meal_name"),
            "kcal": m.get("kcal", 0),
            "protein": m.get("protein", 0),
            "fat": m.get("fat", 0),
            "carbs": m.get("carbs", 0),
            "time_of_day": m.get("time_of_day"),
        }
        for m in meals_raw
    ]

    return NutritionDailySummaryResponse(
        date=today,
        meals=meals_light,
        kcal=MacroSummary(consumed=total_kcal, target=kcal_target),
        protein=MacroSummary(consumed=total_protein, target=protein_target),
        fat=MacroSummary(consumed=total_fat, target=fat_target),
        carbs=MacroSummary(consumed=total_carbs, target=carbs_target),
        water=MacroSummary(consumed=water_consumed, target=water_target),
        remaining_kcal=remaining_kcal,
        status=status,
    )
