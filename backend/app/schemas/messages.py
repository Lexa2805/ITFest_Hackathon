"""Pydantic models for the /api/messages endpoints."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class SendMessageRequest(BaseModel):
    chat_room_id: str
    content: str
    message_type: Literal["text", "meal_share", "recipe_share"] = "text"
    metadata: Optional[dict] = None


class NudgeRequest(BaseModel):
    friend_user_id: str
    template: Literal[
        "Time for the gym!",
        "Have you logged your meals today?",
        "Let's hit our goals today!",
    ]


class MealShareRequest(BaseModel):
    chat_room_id: str
    food_items: list[dict]
    total_calories: int
    total_protein_g: int
    total_carbs_g: int
    total_fat_g: int
    confidence: str
    image_ref: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    chat_room_id: str
    sender_id: Optional[str] = None
    content: str
    message_type: str
    metadata: dict
    created_at: datetime
