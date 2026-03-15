"""
Messages API router — send messages, fetch history, nudges, and meal sharing.

Every endpoint requires a valid Supabase JWT in the Authorization header.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.fridge import get_current_user_id
from app.schemas.messages import (
    MealShareRequest,
    MessageResponse,
    NudgeRequest,
    SendMessageRequest,
)
from app.services import message_service

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.post("/send", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    body: SendMessageRequest,
    user_id: str = Depends(get_current_user_id),
) -> MessageResponse:
    return await message_service.send_message(
        user_id=user_id,
        chat_room_id=body.chat_room_id,
        content=body.content,
        message_type=body.message_type,
        metadata=body.metadata,
    )


@router.get("/{room_id}", response_model=list[MessageResponse])
async def get_message_history(
    room_id: str,
    user_id: str = Depends(get_current_user_id),
) -> list[MessageResponse]:
    return await message_service.get_message_history(room_id)


@router.post("/nudge", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_nudge(
    body: NudgeRequest,
    user_id: str = Depends(get_current_user_id),
) -> MessageResponse:
    return await message_service.send_nudge(user_id, body.friend_user_id, body.template)


@router.post("/meal-share", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_meal_share(
    body: MealShareRequest,
    user_id: str = Depends(get_current_user_id),
) -> MessageResponse:
    return await message_service.send_meal_share(user_id, body)
