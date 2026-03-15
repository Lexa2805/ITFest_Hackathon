"""
Message service — sending messages, fetching history, nudges, and meal sharing.

Uses the shared Supabase service-role async client.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import HTTPException, status

from app.schemas.messages import MealShareRequest, MessageResponse
from app.services.supabase_client import get_supabase

logger = logging.getLogger(__name__)

# Keep strong references to fire-and-forget tasks so they aren't GC'd mid-flight
_background_tasks: set[asyncio.Task] = set()

MESSAGES_TABLE = "messages"
MEMBERS_TABLE = "chat_room_members"


def _row_to_response(row: dict, display_name: str | None = None) -> MessageResponse:
    return MessageResponse(
        id=row["id"],
        chat_room_id=row["chat_room_id"],
        sender_id=row.get("sender_id"),
        sender_display_name=display_name,
        content=row["content"],
        message_type=row["message_type"],
        metadata=row.get("metadata") or {},
        created_at=row["created_at"],
    )


# ---------------------------------------------------------------------------
# Membership check
# ---------------------------------------------------------------------------

async def _verify_membership(user_id: str, chat_room_id: str) -> None:
    """Raise 403 if user is not a member of the chat room."""
    supabase = await get_supabase()
    result = await (
        supabase.table(MEMBERS_TABLE)
        .select("id")
        .eq("chat_room_id", chat_room_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this squad",
        )


# ---------------------------------------------------------------------------
# Core messaging
# ---------------------------------------------------------------------------

async def send_message(
    user_id: str,
    chat_room_id: str,
    content: str,
    message_type: str = "text",
    metadata: dict | None = None,
) -> MessageResponse:
    """Insert a message after verifying membership. Triggers agent listener on @Agent."""
    await _verify_membership(user_id, chat_room_id)

    supabase = await get_supabase()
    result = await (
        supabase.table(MESSAGES_TABLE)
        .insert({
            "chat_room_id": chat_room_id,
            "sender_id": user_id,
            "content": content,
            "message_type": message_type,
            "metadata": metadata or {},
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message.",
        )

    # Fetch sender display name
    profile_result = await (
        supabase.table("profiles")
        .select("name")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    sender_name = (profile_result.data[0]["name"] if profile_result.data else None)

    msg = _row_to_response(result.data[0], sender_name)

    # Fire-and-forget agent listener if @Agent is mentioned (case-insensitive)
    if "@agent" in content.lower():
        task = asyncio.create_task(_trigger_agent(chat_room_id, content))
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)

    return msg


async def get_message_history(
    room_id: str, limit: int = 50,
) -> list[MessageResponse]:
    """Return messages for a room ordered by created_at ASC, enriched with sender names."""
    supabase = await get_supabase()
    result = await (
        supabase.table(MESSAGES_TABLE)
        .select("*")
        .eq("chat_room_id", room_id)
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    rows = result.data or []

    # Collect unique sender IDs and batch-fetch display names
    sender_ids = list({r["sender_id"] for r in rows if r.get("sender_id")})
    name_map: dict[str, str] = {}
    if sender_ids:
        profiles = await (
            supabase.table("profiles")
            .select("user_id, name")
            .in_("user_id", sender_ids)
            .execute()
        )
        for p in (profiles.data or []):
            if p.get("name"):
                name_map[p["user_id"]] = p["name"]

    return [
        _row_to_response(r, name_map.get(r.get("sender_id", ""), None))
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Nudge
# ---------------------------------------------------------------------------

async def send_nudge(
    sender_id: str, friend_user_id: str, template: str,
) -> MessageResponse:
    """Send a nudge system message into the most recent shared squad."""
    supabase = await get_supabase()

    # Find squads the sender belongs to
    sender_rooms = await (
        supabase.table(MEMBERS_TABLE)
        .select("chat_room_id")
        .eq("user_id", sender_id)
        .execute()
    )
    sender_room_ids = [r["chat_room_id"] for r in (sender_rooms.data or [])]
    if not sender_room_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No shared squad found between you and this user",
        )

    # Find the most recent shared squad
    friend_rooms = await (
        supabase.table(MEMBERS_TABLE)
        .select("chat_room_id")
        .eq("user_id", friend_user_id)
        .in_("chat_room_id", sender_room_ids)
        .execute()
    )
    shared_room_ids = [r["chat_room_id"] for r in (friend_rooms.data or [])]
    if not shared_room_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No shared squad found between you and this user",
        )

    # Pick the most recently created shared room
    rooms_result = await (
        supabase.table("chat_rooms")
        .select("id")
        .in_("id", shared_room_ids)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    room_id = rooms_result.data[0]["id"]

    # Get sender display name
    profile_result = await (
        supabase.table("profiles")
        .select("name")
        .eq("user_id", sender_id)
        .limit(1)
        .execute()
    )
    sender_name = (profile_result.data[0]["name"] if profile_result.data else "Someone")

    # Insert system nudge message
    result = await (
        supabase.table(MESSAGES_TABLE)
        .insert({
            "chat_room_id": room_id,
            "sender_id": sender_id,
            "content": f"{sender_name}: {template}",
            "message_type": "system",
            "metadata": {"nudge_from": sender_name, "template": template},
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send nudge.",
        )
    return _row_to_response(result.data[0])


# ---------------------------------------------------------------------------
# Meal sharing
# ---------------------------------------------------------------------------

async def send_meal_share(
    user_id: str, request: MealShareRequest,
) -> MessageResponse:
    """Insert a meal_share message with macro data in metadata."""
    await _verify_membership(user_id, request.chat_room_id)

    supabase = await get_supabase()
    metadata = {
        "food_items": request.food_items,
        "total_calories": request.total_calories,
        "total_protein_g": request.total_protein_g,
        "total_carbs_g": request.total_carbs_g,
        "total_fat_g": request.total_fat_g,
        "confidence": request.confidence,
        "image_ref": request.image_ref,
    }
    result = await (
        supabase.table(MESSAGES_TABLE)
        .insert({
            "chat_room_id": request.chat_room_id,
            "sender_id": user_id,
            "content": "Shared a meal",
            "message_type": "meal_share",
            "metadata": metadata,
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to share meal.",
        )
    return _row_to_response(result.data[0])


# ---------------------------------------------------------------------------
# Agent trigger (fire-and-forget)
# ---------------------------------------------------------------------------

async def _trigger_agent(room_id: str, original_message: str) -> None:
    """Attempt to invoke the agent listener. Failures are logged, not raised."""
    try:
        from app.services.agent_listener import handle_agent_mention
        await handle_agent_mention(room_id, original_message)
    except Exception:
        logger.exception("Agent listener failed for room %s", room_id)
        # Insert a fallback system message so the chat isn't left hanging
        try:
            supabase = await get_supabase()
            await (
                supabase.table(MESSAGES_TABLE)
                .insert({
                    "chat_room_id": room_id,
                    "sender_id": None,
                    "content": "Agent is temporarily unavailable",
                    "message_type": "system",
                    "metadata": {},
                })
                .execute()
            )
        except Exception:
            logger.exception("Failed to insert agent-unavailable message")
