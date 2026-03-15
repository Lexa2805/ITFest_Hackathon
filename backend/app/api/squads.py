"""
Squads API router — CRUD, membership, shared fridge, fork, and steal.

Every endpoint requires a valid Supabase JWT in the Authorization header.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.fridge import get_current_user_id
from app.schemas.squads import (
    SquadCreateRequest,
    SquadDetailResponse,
    SquadMemberAddRequest,
    SquadResponse,
)
from app.services import squad_service

router = APIRouter(prefix="/api/squads", tags=["squads"])


# ---------------------------------------------------------------------------
# Squad CRUD
# ---------------------------------------------------------------------------

@router.post("", response_model=SquadResponse, status_code=status.HTTP_201_CREATED)
async def create_squad(
    body: SquadCreateRequest,
    user_id: str = Depends(get_current_user_id),
) -> SquadResponse:
    return await squad_service.create_squad(user_id, body.name)


@router.get("", response_model=list[SquadResponse])
async def list_squads(
    user_id: str = Depends(get_current_user_id),
) -> list[SquadResponse]:
    return await squad_service.list_user_squads(user_id)


@router.get("/discover", response_model=list[SquadResponse])
async def discover_squads(
    user_id: str = Depends(get_current_user_id),
) -> list[SquadResponse]:
    return await squad_service.list_all_squads(user_id)


@router.post("/{room_id}/join", response_model=SquadResponse, status_code=status.HTTP_201_CREATED)
async def join_squad(
    room_id: str,
    user_id: str = Depends(get_current_user_id),
) -> SquadResponse:
    return await squad_service.join_squad(user_id, room_id)


@router.get("/{room_id}", response_model=SquadDetailResponse)
async def get_squad_detail(
    room_id: str,
    user_id: str = Depends(get_current_user_id),
) -> SquadDetailResponse:
    return await squad_service.get_squad_detail(user_id, room_id)


# ---------------------------------------------------------------------------
# Membership
# ---------------------------------------------------------------------------

@router.post("/{room_id}/members", status_code=status.HTTP_201_CREATED)
async def add_member(
    room_id: str,
    body: SquadMemberAddRequest,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    await squad_service.add_member(room_id, body.user_id)
    return {"message": "Member added."}


@router.delete("/{room_id}/members/{member_user_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def remove_member(
    room_id: str,
    member_user_id: str,
    user_id: str = Depends(get_current_user_id),
):
    await squad_service.remove_member(room_id, member_user_id)


# ---------------------------------------------------------------------------
# Shared Fridge
# ---------------------------------------------------------------------------

@router.post("/{room_id}/shared-fridge/opt-in")
async def opt_in_shared_fridge(
    room_id: str,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    await squad_service.opt_in_shared_fridge(user_id, room_id)
    return {"message": "Opted into shared fridge."}


@router.get("/{room_id}/shared-fridge")
async def get_shared_fridge(
    room_id: str,
    user_id: str = Depends(get_current_user_id),
) -> list[dict]:
    return await squad_service.get_shared_fridge(room_id)


@router.post("/{room_id}/shared-fridge/shopping-list")
async def generate_shared_shopping_list(
    room_id: str,
    user_id: str = Depends(get_current_user_id),
) -> list[dict]:
    return await squad_service.generate_shared_shopping_list(room_id)


# ---------------------------------------------------------------------------
# Fork & Steal
# ---------------------------------------------------------------------------

@router.post("/{room_id}/fork/{message_id}")
async def fork_message(
    room_id: str,
    message_id: str,
    user_id: str = Depends(get_current_user_id),
) -> list[dict]:
    return await squad_service.fork_message(user_id, room_id, message_id)


@router.post("/steal-workout/{friend_id}")
async def steal_workout(
    friend_id: str,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    return await squad_service.steal_workout(user_id, friend_id)


@router.post("/steal-recipes/{friend_id}")
async def steal_recipes(
    friend_id: str,
    user_id: str = Depends(get_current_user_id),
) -> list[dict]:
    return await squad_service.steal_recipes(user_id, friend_id)
