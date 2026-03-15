"""
Squad service — CRUD for squads (chat rooms), membership management,
and squad-level aggregations (avg life score).

Uses the shared Supabase service-role async client.
"""

from __future__ import annotations

from fastapi import HTTPException, status

from app.schemas.squads import (
    SquadDetailResponse,
    SquadMemberResponse,
    SquadResponse,
)
from app.services.life_score_service import get_latest_life_score
from app.services.supabase_client import get_supabase

ROOMS_TABLE = "chat_rooms"
MEMBERS_TABLE = "chat_room_members"

# Grade → numeric mapping for averaging letter grades
_GRADE_VALUES: dict[str, float] = {
    "A+": 4.3, "A": 4.0, "A-": 3.7,
    "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7,
    "D+": 1.3, "D": 1.0, "D-": 0.7,
    "F": 0.0,
}

_VALUE_GRADES: list[tuple[float, str]] = sorted(
    _GRADE_VALUES.items(), key=lambda t: t[1], reverse=True,
)


def _numeric_to_grade(value: float) -> str:
    """Convert a numeric average back to the closest letter grade."""
    for grade, threshold in _VALUE_GRADES:
        if value >= threshold - 0.15:
            return grade
    return "F"


# ---------------------------------------------------------------------------
# Squad CRUD
# ---------------------------------------------------------------------------

async def create_squad(user_id: str, name: str) -> SquadResponse:
    """Create a new squad and add the creator as the first member."""
    supabase = await get_supabase()

    # Insert chat room
    room_result = await (
        supabase.table(ROOMS_TABLE)
        .insert({"name": name, "created_by": user_id})
        .execute()
    )
    if not room_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create squad.",
        )
    room = room_result.data[0]

    # Add creator as first member
    await (
        supabase.table(MEMBERS_TABLE)
        .insert({"chat_room_id": room["id"], "user_id": user_id})
        .execute()
    )

    return SquadResponse(
        id=room["id"],
        name=room["name"],
        created_by=room["created_by"],
        member_count=1,
        created_at=room["created_at"],
    )


async def list_user_squads(user_id: str) -> list[SquadResponse]:
    """Return all squads the user belongs to, with member count and avg life score."""
    supabase = await get_supabase()

    # Get room IDs for this user
    membership_result = await (
        supabase.table(MEMBERS_TABLE)
        .select("chat_room_id")
        .eq("user_id", user_id)
        .execute()
    )
    room_ids = [r["chat_room_id"] for r in (membership_result.data or [])]
    if not room_ids:
        return []

    # Fetch rooms
    rooms_result = await (
        supabase.table(ROOMS_TABLE)
        .select("*")
        .in_("id", room_ids)
        .order("created_at", desc=True)
        .execute()
    )

    squads: list[SquadResponse] = []
    for room in rooms_result.data or []:
        # Count members
        members_result = await (
            supabase.table(MEMBERS_TABLE)
            .select("user_id")
            .eq("chat_room_id", room["id"])
            .execute()
        )
        member_ids = [m["user_id"] for m in (members_result.data or [])]

        avg_score, avg_grade = await _compute_avg_life_score(member_ids)

        squads.append(SquadResponse(
            id=room["id"],
            name=room["name"],
            created_by=room["created_by"],
            avg_life_score=avg_score,
            avg_life_score_grade=avg_grade,
            member_count=len(member_ids),
            created_at=room["created_at"],
        ))

    return squads


async def get_squad_detail(user_id: str, room_id: str) -> SquadDetailResponse:
    """Return squad metadata, members with display names, and avg life score."""
    supabase = await get_supabase()

    # Fetch room
    room_result = await (
        supabase.table(ROOMS_TABLE)
        .select("*")
        .eq("id", room_id)
        .limit(1)
        .execute()
    )
    if not room_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Squad not found",
        )
    room = room_result.data[0]

    # Fetch members
    members_result = await (
        supabase.table(MEMBERS_TABLE)
        .select("user_id, fridge_linked, joined_at")
        .eq("chat_room_id", room_id)
        .execute()
    )
    member_rows = members_result.data or []
    member_ids = [m["user_id"] for m in member_rows]

    # Fetch display names from profiles
    display_names: dict[str, str | None] = {}
    if member_ids:
        profiles_result = await (
            supabase.table("profiles")
            .select("user_id, name")
            .in_("user_id", member_ids)
            .execute()
        )
        for p in profiles_result.data or []:
            display_names[p["user_id"]] = p.get("name")

    members = [
        SquadMemberResponse(
            user_id=m["user_id"],
            display_name=display_names.get(m["user_id"]),
            fridge_linked=m["fridge_linked"],
            joined_at=m["joined_at"],
        )
        for m in member_rows
    ]

    avg_score, avg_grade = await _compute_avg_life_score(member_ids)

    return SquadDetailResponse(
        id=room["id"],
        name=room["name"],
        created_by=room["created_by"],
        avg_life_score=avg_score,
        avg_life_score_grade=avg_grade,
        member_count=len(members),
        created_at=room["created_at"],
        members=members,
    )


async def add_member(room_id: str, user_id: str) -> None:
    """Add a user to a squad."""
    supabase = await get_supabase()
    result = await (
        supabase.table(MEMBERS_TABLE)
        .insert({"chat_room_id": room_id, "user_id": user_id})
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add member.",
        )


async def remove_member(room_id: str, user_id: str) -> None:
    """Remove a user from a squad."""
    supabase = await get_supabase()
    result = await (
        supabase.table(MEMBERS_TABLE)
        .delete()
        .eq("chat_room_id", room_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this squad.",
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _compute_avg_life_score(
    member_ids: list[str],
) -> tuple[float | None, str | None]:
    """Compute average life score across members, excluding those with no score."""
    numeric_scores: list[float] = []
    for uid in member_ids:
        ls = await get_latest_life_score(uid)
        if ls and ls.score in _GRADE_VALUES:
            numeric_scores.append(_GRADE_VALUES[ls.score])

    if not numeric_scores:
        return None, None

    avg = sum(numeric_scores) / len(numeric_scores)
    return round(avg, 2), _numeric_to_grade(avg)


# ---------------------------------------------------------------------------
# Shared Fridge (Req 9.1–9.5)
# ---------------------------------------------------------------------------

async def opt_in_shared_fridge(user_id: str, room_id: str) -> None:
    """Mark a member as fridge-linked in the squad."""
    supabase = await get_supabase()
    result = await (
        supabase.table(MEMBERS_TABLE)
        .update({"fridge_linked": True})
        .eq("chat_room_id", room_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this squad.",
        )


async def get_shared_fridge(room_id: str) -> list[dict]:
    """Aggregate fridge items from all fridge-linked members, annotated with owner info."""
    from datetime import date as _date

    from app.services.fridge_service import get_items as get_fridge_items

    supabase = await get_supabase()

    # Get fridge-linked members
    members_result = await (
        supabase.table(MEMBERS_TABLE)
        .select("user_id")
        .eq("chat_room_id", room_id)
        .eq("fridge_linked", True)
        .execute()
    )
    linked_members = members_result.data or []
    if not linked_members:
        return []

    member_ids = [m["user_id"] for m in linked_members]

    # Fetch display names
    profiles_result = await (
        supabase.table("profiles")
        .select("user_id, name")
        .in_("user_id", member_ids)
        .execute()
    )
    display_names: dict[str, str | None] = {
        p["user_id"]: p.get("name") for p in (profiles_result.data or [])
    }

    # Aggregate fridge items
    combined: list[dict] = []
    today = _date.today()
    for uid in member_ids:
        items = await get_fridge_items(uid)
        for item in items:
            expiring_soon = False
            if item.expiry_date:
                expiring_soon = (item.expiry_date - today).days <= 3
            combined.append({
                "id": str(item.id),
                "owner_user_id": uid,
                "owner_display_name": display_names.get(uid),
                "name": item.name,
                "quantity": item.quantity,
                "unit": item.unit,
                "category": item.category,
                "expiry_date": item.expiry_date.isoformat() if item.expiry_date else None,
                "expiring_soon": expiring_soon,
            })

    return combined


async def generate_shared_shopping_list(room_id: str) -> list[dict]:
    """Collect combined inventory from fridge-linked members and generate a shopping list."""
    from app.services.fridge_service import get_items as get_fridge_items
    from app.services.shopping_service import ShoppingService

    supabase = await get_supabase()

    # Get fridge-linked members
    members_result = await (
        supabase.table(MEMBERS_TABLE)
        .select("user_id")
        .eq("chat_room_id", room_id)
        .eq("fridge_linked", True)
        .execute()
    )
    linked_members = members_result.data or []
    if not linked_members:
        return []

    # Collect all fridge items as dicts for the shopping service
    fridge_items: list[dict] = []
    for m in linked_members:
        items = await get_fridge_items(m["user_id"])
        for item in items:
            fridge_items.append({
                "name": item.name,
                "quantity": item.quantity,
                "unit": item.unit,
                "category": item.category,
                "expiry_date": item.expiry_date.isoformat() if item.expiry_date else None,
            })

    # Fetch recent recipes for all linked members to determine what's needed
    recipes: list[dict] = []
    for m in linked_members:
        result = await (
            supabase.table("recipes")
            .select("ingredients")
            .eq("user_id", m["user_id"])
            .order("generated_at", desc=True)
            .limit(5)
            .execute()
        )
        for r in (result.data or []):
            recipes.append(r)

    if not recipes:
        return []

    shopping_service = ShoppingService()
    return await shopping_service.generate_shopping_list(recipes, fridge_items)


# ---------------------------------------------------------------------------
# Fork & Steal (Req 5.1–5.4, 8.1–8.4)
# ---------------------------------------------------------------------------

async def fork_message(user_id: str, room_id: str, message_id: str) -> list[dict]:
    """Extract ingredients from a shared message and push to user's shopping list."""
    from app.services.shopping_service import ShoppingService

    supabase = await get_supabase()

    # Fetch the message
    msg_result = await (
        supabase.table("messages")
        .select("*")
        .eq("id", message_id)
        .eq("chat_room_id", room_id)
        .limit(1)
        .execute()
    )
    if not msg_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found.",
        )

    msg = msg_result.data[0]
    metadata = msg.get("metadata") or {}

    # Extract ingredients based on message type
    ingredients: list[dict] = []
    if msg.get("message_type") == "meal_share":
        for food in metadata.get("food_items", []):
            name = food.get("name") or food.get("ingredient_name")
            if name:
                ingredients.append({
                    "name": name,
                    "quantity": food.get("quantity", 1),
                    "unit": food.get("unit", "serving"),
                })
    elif msg.get("message_type") == "recipe_share":
        ingredients = metadata.get("ingredients", [])
    else:
        ingredients = metadata.get("ingredients", [])

    if not ingredients:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This message has no ingredients to fork",
        )

    # Get user's current fridge for context
    from app.services.fridge_service import get_items as get_fridge_items

    user_fridge = await get_fridge_items(user_id)
    fridge_dicts = [
        {"name": i.name, "quantity": i.quantity, "unit": i.unit, "category": i.category}
        for i in user_fridge
    ]

    # Build a pseudo-recipe from the ingredients to pass to shopping service
    pseudo_recipe = {"ingredients": ingredients}
    shopping_service = ShoppingService()
    return await shopping_service.generate_shopping_list([pseudo_recipe], fridge_dicts)


async def steal_workout(user_id: str, friend_id: str) -> dict:
    """Copy a friend's active workout split for the requesting user."""
    from app.services.profile_service import get_profile
    from app.services.workout_split_service import generate_split

    # Fetch friend's profile to get their workout config
    friend_profile_data = await get_profile(friend_id)
    if not friend_profile_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This user has no active workout split",
        )

    # Check if friend has workout data
    if not friend_profile_data.get("available_days_per_week"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This user has no active workout split",
        )

    # Fetch the requesting user's profile
    user_profile_data = await get_profile(user_id)
    if not user_profile_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your profile first.",
        )

    # Generate a split using the friend's config but for the requesting user
    from app.schemas.profile import ProfileResponse

    friend_profile = ProfileResponse(**friend_profile_data)
    split = generate_split(friend_profile)

    return split


async def steal_recipes(user_id: str, friend_id: str) -> list[dict]:
    """Copy a friend's latest recipes for the requesting user."""
    from app.services.recipe_service import get_user_recipes

    friend_recipes = await get_user_recipes(friend_id, limit=5)
    if not friend_recipes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This user has no recipes to steal",
        )

    # Duplicate recipes for the requesting user
    supabase = await get_supabase()
    import datetime

    duplicated: list[dict] = []
    generated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for recipe in friend_recipes:
        payload = {
            "user_id": user_id,
            "name": recipe.name,
            "ingredients": [ing.model_dump() for ing in recipe.ingredients],
            "instructions": recipe.instructions,
            "calories": recipe.calories,
            "protein_g": recipe.protein_g,
            "carbs_g": recipe.carbs_g,
            "fat_g": recipe.fat_g,
            "prep_time_minutes": recipe.prep_time_minutes,
            "generated_at": generated_at,
        }
        result = await supabase.table("recipes").insert(payload).execute()
        if result.data:
            duplicated.append(result.data[0])

    return duplicated
