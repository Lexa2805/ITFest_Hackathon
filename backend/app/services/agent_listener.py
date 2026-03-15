"""
Agent listener — handles @Agent mentions in squad chat.

Loads chat history + combined fridge inventories for all squad members,
passes context to OpenRouter (GPT-5.1), and inserts the AI response as
an agent_response message.
"""

from __future__ import annotations

import json
import logging
import os

import httpx

from app.services.supabase_client import get_supabase

logger = logging.getLogger(__name__)

MESSAGES_TABLE = "messages"
MEMBERS_TABLE = "chat_room_members"

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-5.1")

SYSTEM_PROMPT = (
    "You are a helpful nutrition and health assistant embedded in a group chat. "
    "You have access to the chat history and the combined fridge inventories of "
    "all group members. Use this context to provide relevant, actionable advice. "
    "Be concise and friendly. If asked about recipes, suggest meals using the "
    "available fridge ingredients. If asked about health, provide general wellness tips."
)


async def handle_agent_mention(room_id: str, original_message: str) -> None:
    """
    Process an @Agent mention:
    1. Load last 50 messages from the room
    2. Fetch fridge items for every squad member
    3. Format context and call OpenRouter
    4. Insert agent_response message
    On failure, insert a system message indicating unavailability.
    """
    supabase = await get_supabase()

    try:
        # 1. Load chat history (last 50 messages)
        history_result = await (
            supabase.table(MESSAGES_TABLE)
            .select("sender_id, content, message_type, created_at")
            .eq("chat_room_id", room_id)
            .order("created_at", desc=False)
            .limit(50)
            .execute()
        )
        chat_history = history_result.data or []

        # 2. Fetch all members and their fridge items
        members_result = await (
            supabase.table(MEMBERS_TABLE)
            .select("user_id")
            .eq("chat_room_id", room_id)
            .execute()
        )
        member_ids = [m["user_id"] for m in (members_result.data or [])]

        # Fetch display names
        display_names: dict[str, str] = {}
        if member_ids:
            profiles_result = await (
                supabase.table("profiles")
                .select("user_id, name")
                .in_("user_id", member_ids)
                .execute()
            )
            for p in (profiles_result.data or []):
                display_names[p["user_id"]] = p.get("name") or p["user_id"]

        # Fetch fridge items for each member
        from app.services.fridge_service import get_items as get_fridge_items

        combined_fridge: list[dict] = []
        for uid in member_ids:
            member_name = display_names.get(uid, uid)
            items = await get_fridge_items(uid)
            for item in items:
                combined_fridge.append({
                    "owner": member_name,
                    "name": item.name,
                    "quantity": item.quantity,
                    "unit": item.unit,
                    "category": item.category,
                    "expiry_date": item.expiry_date.isoformat() if item.expiry_date else None,
                })

        # 3. Format context and call LLM
        context_lines = []
        for msg in chat_history:
            sender = display_names.get(msg.get("sender_id", ""), "Unknown")
            context_lines.append(f"{sender}: {msg['content']}")

        context_payload = {
            "chat_history": "\n".join(context_lines[-30:]),  # last 30 for token budget
            "combined_fridge_inventory": combined_fridge,
            "user_question": original_message,
        }

        ai_response = await _call_openrouter(context_payload)

        # 4. Insert agent_response message
        await (
            supabase.table(MESSAGES_TABLE)
            .insert({
                "chat_room_id": room_id,
                "sender_id": None,
                "content": ai_response,
                "message_type": "agent_response",
                "metadata": {
                    "context_members": member_ids,
                    "fridge_items_count": len(combined_fridge),
                    "model": MODEL,
                },
            })
            .execute()
        )

    except Exception:
        logger.exception("Agent listener failed for room %s", room_id)
        # Insert fallback system message
        try:
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
            logger.exception("Failed to insert agent-unavailable fallback message")


async def _call_openrouter(context: dict) -> str:
    """Send context to OpenRouter and return the AI response text."""
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://personal-health-os.app",
        "X-Title": "Personal Health OS",
    }

    payload = {
        "model": MODEL,
        "temperature": 0.4,
        "max_tokens": 1024,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(context)},
        ],
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(OPENROUTER_BASE_URL, json=payload, headers=headers)
        resp.raise_for_status()

    body = resp.json()
    return body["choices"][0]["message"]["content"].strip()
