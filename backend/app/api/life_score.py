"""Life Score API routes — generate and retrieve AI-driven health grades."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.fridge import get_current_user_id
from app.schemas.life_score import LifeScoreResponse
from app.services import life_score_service

router = APIRouter(tags=["life-score"])


@router.post(
    "/health/life-score/generate",
    response_model=LifeScoreResponse,
    summary="Generate a new Life Score via LLM evaluation",
)
@router.post(
    "/api/health/life-score/generate",
    response_model=LifeScoreResponse,
    include_in_schema=False,
)
async def generate_life_score(
    user_id: str = Depends(get_current_user_id),
) -> LifeScoreResponse:
    """
    Validate prerequisites (health data + profile), check rate limit,
    call GPT-5.1 via OpenRouter, and persist the resulting grade.
    """
    return await life_score_service.generate_life_score(user_id)


@router.get(
    "/health/life-score",
    response_model=LifeScoreResponse,
    summary="Retrieve the latest Life Score for the current user",
)
@router.get(
    "/api/health/life-score",
    response_model=LifeScoreResponse,
    include_in_schema=False,
)
async def get_latest_life_score(
    user_id: str = Depends(get_current_user_id),
) -> LifeScoreResponse:
    """Return the most recent Life Score or 404 if none exists."""
    result = await life_score_service.get_latest_life_score(user_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Life Score found. Generate your first score to see your wellness grade.",
        )
    return result
