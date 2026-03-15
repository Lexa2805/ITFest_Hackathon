"""
Flex Profile API router — view a friend's interactive profile.

Requires a valid Supabase JWT in the Authorization header.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.fridge import get_current_user_id
from app.schemas.flex_profile import FlexProfileResponse
from app.services.flex_profile_service import get_flex_profile

router = APIRouter(prefix="/api/flex-profile", tags=["flex-profile"])


@router.get("/{user_id}", response_model=FlexProfileResponse)
async def get_profile(
    user_id: str,
    _current_user: str = Depends(get_current_user_id),
) -> FlexProfileResponse:
    return await get_flex_profile(user_id)
