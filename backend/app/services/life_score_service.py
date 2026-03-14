"""
Life Score service — computes an AI-driven holistic health grade (A+ … F)
by aggregating Apple Watch biometrics + user profile, calling GPT-5.1 via
OpenRouter, validating the response, and persisting the result.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import NamedTuple

import httpx
from dotenv import load_dotenv

from app.schemas.life_score import VALID_GRADES, LifeScoreResponse, MetricsSnapshot
from app.services.supabase_client import get_supabase

load_dotenv()

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-5.1"
LLM_TIMEOUT = 30.0
RATE_LIMIT_DAYS = 7


SYSTEM_PROMPT = (
    "You are a certified health and wellness evaluator. "
    "You will receive a JSON object containing a user's 30-day average biometric "
    "metrics and body profile. Evaluate their overall wellness and return ONLY a "
    "strict JSON object with the following fields:\n"
    '- "score": a letter grade from the set {A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F}\n'
    '- "summary": a 2-3 sentence natural-language summary of the user\'s overall health\n'
    '- "top_strengths": an array of 2-3 strings highlighting the user\'s strongest health areas\n'
    '- "areas_for_improvement": an array of 2-4 actionable strings suggesting improvements\n\n'
    "Return ONLY the JSON object. No markdown, no code blocks, no extra text."
)


# ---------------------------------------------------------------------------
# Rate-limit check
# ---------------------------------------------------------------------------

class RateLimitResult(NamedTuple):
    allowed: bool
    message: str


async def check_rate_limit(user_id: str) -> RateLimitResult:
    """
    Compare the latest life_scores.created_at against health_exports.updated_at.
    Allow generation when:
      • new health data has been uploaded since the last score, OR
      • more than 7 days have elapsed since the last score.
    If no score exists yet, generation is always allowed.
    """
    supabase = await get_supabase()

    # Latest life score
    score_result = await (
        supabase.table("life_scores")
        .select("created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not score_result.data:
        return RateLimitResult(allowed=True, message="")

    last_score_at = datetime.fromisoformat(score_result.data[0]["created_at"])

    # Latest health export update
    export_result = await (
        supabase.table("health_exports")
        .select("updated_at")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    now = datetime.now(timezone.utc)
    days_elapsed = (now - last_score_at).total_seconds() / 86400

    if days_elapsed >= RATE_LIMIT_DAYS:
        return RateLimitResult(allowed=True, message="")

    if export_result.data:
        export_updated = datetime.fromisoformat(export_result.data[0]["updated_at"])
        if export_updated > last_score_at:
            return RateLimitResult(allowed=True, message="")

    next_allowed = last_score_at + timedelta(days=RATE_LIMIT_DAYS)
    return RateLimitResult(
        allowed=False,
        message=(
            "Life Score is up to date. Upload new health data or wait until "
            f"{next_allowed.strftime('%Y-%m-%d')} to recalculate."
        ),
    )


# ---------------------------------------------------------------------------
# 30-day average computation & BMI
# ---------------------------------------------------------------------------


def _compute_30day_averages(parsed_metrics: dict) -> dict[str, float]:
    """
    Extract pre-computed averages from the parsed_metrics stored in the DB.

    The health export parser already aggregates daily values and computes
    averages at upload time.  We pull those summary averages directly.
    If a metric section is missing or has zero samples, default to 0.
    """

    def _avg(section_key: str) -> float:
        section = parsed_metrics.get(section_key) or {}
        if section.get("sample_count", 0) == 0:
            return 0.0
        return float(section.get("average", 0.0))

    return {
        "avg_heart_rate_bpm": _avg("heart_rate"),
        "avg_daily_steps": _avg("step_count"),
        "avg_nightly_sleep_hours": _avg("sleep_analysis"),
        "avg_hrv_sdnn_ms": _avg("hrv_sdnn"),
        "avg_daily_active_energy_kcal": _avg("active_energy_burned"),
    }


def _compute_bmi(weight_kg: float, height_cm: float) -> float:
    """Standard BMI formula: weight / (height_m ** 2), rounded to 1 dp."""
    if height_cm <= 0 or weight_kg <= 0:
        return 0.0
    height_m = height_cm / 100.0
    return round(weight_kg / (height_m ** 2), 1)


# ---------------------------------------------------------------------------
# Anonymized LLM payload builder & OpenRouter call
# ---------------------------------------------------------------------------


def _build_llm_payload(metrics: dict[str, float], profile: dict) -> dict:
    """
    Construct the anonymized JSON payload for GPT-5.1.
    Includes only computed metrics + age/gender — no PII (user_id, email,
    name, date of birth).
    """
    return {
        "avg_heart_rate_bpm": metrics["avg_heart_rate_bpm"],
        "avg_daily_steps": metrics["avg_daily_steps"],
        "avg_nightly_sleep_hours": metrics["avg_nightly_sleep_hours"],
        "avg_hrv_sdnn_ms": metrics["avg_hrv_sdnn_ms"],
        "avg_daily_active_energy_kcal": metrics["avg_daily_active_energy_kcal"],
        "weight_kg": float(profile.get("weight", 0)),
        "height_cm": float(profile.get("height", 0)),
        "age": int(profile.get("age", 0)),
        "gender": str(profile.get("gender", "unknown")),
        "bmi": metrics["bmi"],
    }


async def _call_openrouter(payload: dict) -> dict:
    """
    Send a chat completion request to OpenRouter with JSON mode.
    Retries exactly once on 502 / 504.
    """
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://personal-health-os.app",
        "X-Title": "Personal Health OS",
    }

    body = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(payload)},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
        "max_tokens": 512,
    }

    last_error: Exception | None = None
    for attempt in range(2):  # initial + 1 retry
        try:
            async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
                resp = await client.post(OPENROUTER_URL, json=body, headers=headers)

            if resp.status_code in (502, 504) and attempt == 0:
                logger.warning(
                    "OpenRouter returned %s, retrying once…", resp.status_code
                )
                continue

            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)

        except Exception as exc:
            last_error = exc
            if attempt == 0:
                logger.warning("OpenRouter call failed (%s), retrying once…", exc)
                continue
            break

    raise last_error or RuntimeError("OpenRouter call failed after retry")


# ---------------------------------------------------------------------------
# Grade validation & persistence
# ---------------------------------------------------------------------------


def _validate_grade(score: str) -> bool:
    """Return True iff *score* is a member of the valid grades set."""
    return score in VALID_GRADES


async def _persist_life_score(
    user_id: str,
    llm_result: dict,
    metrics_snapshot: dict,
) -> dict:
    """Insert a new life_scores row and return the created record."""
    supabase = await get_supabase()

    row = {
        "user_id": user_id,
        "score": llm_result["score"],
        "summary": llm_result["summary"],
        "top_strengths": llm_result["top_strengths"],
        "areas_for_improvement": llm_result["areas_for_improvement"],
        "metrics_snapshot": metrics_snapshot,
    }

    result = await supabase.table("life_scores").insert(row).execute()

    if not result.data:
        raise RuntimeError("Failed to persist Life Score")

    return result.data[0]


# ---------------------------------------------------------------------------
# Public API — orchestrator & retrieval
# ---------------------------------------------------------------------------


async def generate_life_score(user_id: str) -> LifeScoreResponse:
    """
    Full orchestration flow:
      1. Fetch health export data
      2. Fetch user profile
      3. Check rate limit
      4. Compute 30-day averages + BMI
      5. Build anonymized LLM payload
      6. Call OpenRouter (GPT-5.1)
      7. Validate grade
      8. Persist result
      9. Return LifeScoreResponse
    """
    from fastapi import HTTPException

    supabase = await get_supabase()

    # 1. Health export data
    he_result = await (
        supabase.table("health_exports")
        .select("parsed_metrics, updated_at")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not he_result.data:
        raise HTTPException(
            status_code=404,
            detail="No health data found. Please upload a health export first.",
        )

    parsed_metrics = he_result.data[0].get("parsed_metrics") or {}

    # 2. Profile
    profile_result = await (
        supabase.table("profiles")
        .select("weight, height, age, gender")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not profile_result.data:
        raise HTTPException(
            status_code=400,
            detail=(
                "Profile incomplete. Please set your weight, height, and age "
                "before generating a Life Score."
            ),
        )

    profile = profile_result.data[0]
    if not profile.get("weight") or not profile.get("height") or not profile.get("age"):
        raise HTTPException(
            status_code=400,
            detail=(
                "Profile incomplete. Please set your weight, height, and age "
                "before generating a Life Score."
            ),
        )

    # 3. Rate limit
    rate = await check_rate_limit(user_id)
    if not rate.allowed:
        raise HTTPException(status_code=429, detail=rate.message)

    # 4. Compute averages + BMI
    averages = _compute_30day_averages(parsed_metrics)
    bmi = _compute_bmi(float(profile["weight"]), float(profile["height"]))
    averages["bmi"] = bmi

    # 5. Build anonymized payload
    payload = _build_llm_payload(averages, profile)

    # 6. Call OpenRouter
    try:
        llm_result = await _call_openrouter(payload)
    except Exception as exc:
        logger.error("OpenRouter call failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="AI service is temporarily unavailable. Please try again later.",
        )

    # 7. Validate grade
    score = llm_result.get("score", "")
    if not _validate_grade(score):
        logger.error("LLM returned invalid grade: %s", score)
        raise HTTPException(
            status_code=502,
            detail="AI evaluation failed. Please try again later.",
        )

    # 8. Build metrics snapshot for persistence
    snapshot = {
        **averages,
        "weight_kg": float(profile["weight"]),
        "height_cm": float(profile["height"]),
        "age": int(profile["age"]),
        "gender": str(profile.get("gender", "unknown")),
    }

    # 9. Persist
    try:
        row = await _persist_life_score(user_id, llm_result, snapshot)
    except Exception as exc:
        logger.error("Failed to persist life score: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="AI evaluation failed. Please try again later.",
        )

    return LifeScoreResponse(
        id=row["id"],
        score=row["score"],
        summary=row["summary"],
        top_strengths=row["top_strengths"],
        areas_for_improvement=row["areas_for_improvement"],
        metrics_snapshot=MetricsSnapshot(**snapshot),
        created_at=row["created_at"],
    )


async def get_latest_life_score(user_id: str) -> LifeScoreResponse | None:
    """Return the most recent life score for *user_id*, or None."""
    supabase = await get_supabase()

    result = await (
        supabase.table("life_scores")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not result.data:
        return None

    row = result.data[0]
    return LifeScoreResponse(
        id=row["id"],
        score=row["score"],
        summary=row["summary"],
        top_strengths=row["top_strengths"],
        areas_for_improvement=row["areas_for_improvement"],
        metrics_snapshot=MetricsSnapshot(**row["metrics_snapshot"]),
        created_at=row["created_at"],
    )
