"""Pydantic models for the /api/squads endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SquadCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class SquadMemberAddRequest(BaseModel):
    user_id: str


class SquadMemberResponse(BaseModel):
    user_id: str
    display_name: Optional[str] = None
    fridge_linked: bool
    joined_at: datetime


class SquadResponse(BaseModel):
    id: str
    name: str
    created_by: str
    avg_life_score: Optional[float] = None
    avg_life_score_grade: Optional[str] = None
    member_count: int
    created_at: datetime


class SquadDetailResponse(SquadResponse):
    members: list[SquadMemberResponse]
