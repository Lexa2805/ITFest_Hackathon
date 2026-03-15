"""Service for generating personalized workout splits based on user profile."""

from typing import Literal

from app.schemas.profile import ProfileResponse
from app.schemas.workout import DailyWorkout, ExerciseResponse, SplitType
from app.services.workout_service import get_exercises_by_muscle_group

SPLIT_PATTERNS: dict[SplitType, list[str]] = {
    "full_body": ["full body"],
    "upper_lower": ["upper body", "lower body"],
    "push_pull_legs": ["push", "pull", "legs"],
}

MUSCLE_TARGETS: dict[str, list[str]] = {
    "full body": ["chest", "back", "legs", "shoulders", "core", "arms"],
    "upper body": ["chest", "back", "shoulders", "arms"],
    "lower body": ["legs", "glutes", "hamstrings", "quadriceps", "calves", "core"],
    "push": ["chest", "shoulders", "triceps"],
    "pull": ["back", "biceps", "rear delts"],
    "legs": ["legs", "glutes", "hamstrings", "quadriceps", "calves"],
    "cardio + legs": ["legs", "glutes", "calves", "core"],
    "upper body + cardio": ["chest", "back", "shoulders", "arms", "core"],
}

DayState = Literal["gym", "rest", "recovery"]


def _sanitize_day_states(day_states: dict[int, str] | None) -> dict[int, DayState] | None:
    if not day_states:
        return None

    normalized: dict[int, DayState] = {}
    for day_index in range(7):
        raw = day_states.get(day_index)
        if raw == "gym" or raw == "rest" or raw == "recovery":
            normalized[day_index] = raw
        else:
            normalized[day_index] = "rest"

    return normalized


def _resolve_training_days(
    profile_days: int,
    day_states: dict[int, DayState] | None,
) -> int:
    if not day_states:
        return max(1, min(profile_days, 7))

    gym_days = sum(1 for state in day_states.values() if state == "gym")
    return max(1, min(gym_days, 7))


def generate_split(
    profile: ProfileResponse,
    preferred_split: SplitType | None = None,
    day_states: dict[int, str] | None = None,
) -> dict:
    """
    Generate a workout split based on user profile.
    
    Maps user profile data (goal, experience level, available days) to appropriate
    training split and rep ranges using decision tree logic.
    
    Args:
        profile: User profile containing goal, experience_level, and available_days_per_week
        
    Returns:
        Dictionary containing:
            - split_type: The assigned training split (full_body, upper_lower, push_pull_legs)
            - rep_range: Tuple of (min_reps, max_reps) based on goal
            - days_per_week: Number of training days
            
    Raises:
        ValueError: If required profile fields are missing
    """
    if profile.available_days_per_week is None:
        raise ValueError("User profile must have available_days_per_week set")
    
    # Get profile data
    requested_days = profile.available_days_per_week
    experience = profile.experience_level or "beginner"  # Default to beginner if not set
    goal = profile.goal or "maintain"
    normalized_day_states = _sanitize_day_states(day_states)
    days = _resolve_training_days(requested_days, normalized_day_states)
    
    # Determine split type based on decision tree
    split_type = _determine_split_type(days, experience, preferred_split)
    
    # Determine rep range based on goal
    rep_range = _determine_rep_range(goal)
    
    daily_workouts = assign_exercises(
        split_type=split_type,
        goal=goal,
        experience=experience,
        rep_range=rep_range,
        days_per_week=days,
        day_states=normalized_day_states,
    )

    return {
        "split_type": split_type,
        "rep_range": rep_range,
        "days_per_week": days,
        "daily_workouts": daily_workouts,
    }


def _determine_split_type(
    days: int,
    experience: str | None,
    preferred_split: SplitType | None = None,
) -> SplitType:
    """
    Determine training split based on available days and experience level.
    
    Decision tree logic:
    - days <= 2: Full Body
    - days == 3: Push/Pull/Legs
    - days == 4: Upper/Lower
    - days >= 5 AND advanced: Push/Pull/Legs
    - days >= 5 AND not advanced: Upper/Lower (safer for non-advanced)
    
    Args:
        days: Number of available training days per week
        experience: User experience level (beginner, intermediate, advanced)
        
    Returns:
        The appropriate split type
    """
    if days <= 2:
        recommended: SplitType = "full_body"
    elif days == 3:
        recommended = "push_pull_legs"
    elif days == 4:
        recommended = "upper_lower"
    elif days >= 5:
        recommended = "push_pull_legs" if experience == "advanced" else "upper_lower"
    else:
        recommended = "full_body"

    if not preferred_split:
        return recommended

    if preferred_split == "push_pull_legs" and days < 3:
        return recommended

    if preferred_split == "upper_lower" and days < 2:
        return recommended

    if preferred_split == "push_pull_legs" and experience != "advanced" and days >= 5:
        return recommended

    return preferred_split


def _determine_rep_range(goal: str) -> tuple[int, int]:
    """
    Determine rep range based on user goal.
    
    Mapping:
    - "lose weight" → 12-15 reps (higher rep range)
    - "build muscle" → 8-12 reps (hypertrophy range)
    - "maintain" → 10-12 reps (moderate range)
    - "improve endurance" → 12-15 reps (higher rep range)
    
    Args:
        goal: User fitness goal
        
    Returns:
        Tuple of (min_reps, max_reps)
    """
    if goal == "lose weight":
        return (12, 15)
    elif goal == "build muscle":
        return (8, 12)
    elif goal == "maintain":
        return (10, 12)
    elif goal == "improve endurance":
        return (12, 15)
    else:
        # Default to moderate range
        return (10, 12)


def _difficulty_order(experience: str | None) -> list[str]:
    if experience == "advanced":
        return ["advanced", "intermediate", "beginner"]
    if experience == "intermediate":
        return ["intermediate", "beginner"]
    return ["beginner"]


def _pick_exercises_for_focus(
    focus: str,
    experience: str | None,
    rep_range: tuple[int, int],
    target_count: int,
) -> list[ExerciseResponse]:
    selected: list[ExerciseResponse] = []
    seen_ids: set[str] = set()
    muscle_groups = MUSCLE_TARGETS.get(focus, ["full body"])
    difficulties = _difficulty_order(experience)

    for muscle in muscle_groups:
        for difficulty in difficulties:
            matches = get_exercises_by_muscle_group(muscle, difficulty)
            for exercise in matches:
                exercise_id = str(exercise.id)
                if exercise_id in seen_ids:
                    continue

                rep_span = rep_range[1] - rep_range[0]
                rep_value = rep_range[0] + (len(selected) % (rep_span + 1 if rep_span >= 0 else 1))
                adjusted = exercise.model_copy(update={"reps": rep_value})

                selected.append(adjusted)
                seen_ids.add(exercise_id)
                if len(selected) >= target_count:
                    return selected

    if selected:
        return selected

    fallback_difficulties = _difficulty_order(experience)
    for difficulty in fallback_difficulties:
        fallback_matches = get_exercises_by_muscle_group("full body", difficulty)
        for exercise in fallback_matches:
            selected.append(exercise)
            if len(selected) >= target_count:
                return selected

    return selected


def _resolve_pattern(split_type: SplitType, goal: str, days_per_week: int) -> list[str]:
    if split_type == "full_body" and goal == "improve endurance" and days_per_week >= 3:
        return ["full body", "cardio + legs", "upper body + cardio"]

    if split_type == "upper_lower" and goal == "improve endurance":
        return ["upper body + cardio", "lower body", "upper body", "cardio + legs"]

    return SPLIT_PATTERNS[split_type]


def assign_exercises(
    split_type: SplitType,
    goal: str,
    experience: str | None,
    rep_range: tuple[int, int],
    days_per_week: int,
    day_states: dict[int, DayState] | None = None,
) -> list[DailyWorkout]:
    """Assign exercises into a complete 7-day plan with rest days."""
    training_days = max(1, min(days_per_week, 7))
    pattern = _resolve_pattern(split_type, goal, training_days)
    daily_workouts: list[DailyWorkout] = []
    if day_states:
        training_day_indices = sorted(day for day, state in day_states.items() if state == "gym")
        if not training_day_indices:
            training_day_indices = _build_training_day_indices(training_days)
    else:
        training_day_indices = _build_training_day_indices(training_days)

    training_day_lookup = set(training_day_indices)
    recovery_day_lookup = set(
        day for day, state in (day_states or {}).items() if state == "recovery"
    )

    for day_index in range(7):
        if day_index not in training_day_lookup:
            is_recovery_day = day_index in recovery_day_lookup
            daily_workouts.append(
                DailyWorkout(
                    day_of_week=day_index,
                    muscle_group="recovery" if is_recovery_day else None,
                    is_rest_day=True,
                    exercises=[],
                )
            )
            continue

        training_slot = training_day_indices.index(day_index)
        focus = pattern[training_slot % len(pattern)]
        target_count = 6 if split_type == "full_body" else 5
        exercises = _pick_exercises_for_focus(
            focus=focus,
            experience=experience,
            rep_range=rep_range,
            target_count=target_count,
        )

        daily_workouts.append(
            DailyWorkout(
                day_of_week=day_index,
                muscle_group=focus,
                is_rest_day=False,
                exercises=exercises,
            )
        )

    return daily_workouts


def _build_training_day_indices(training_days: int) -> list[int]:
    """Spread training days across the week while keeping order stable."""
    if training_days >= 7:
        return list(range(7))

    step = 6 / (training_days - 1) if training_days > 1 else 0
    raw_indices = [round(step * slot) for slot in range(training_days)]

    unique_sorted: list[int] = []
    for index in raw_indices:
        normalized = max(0, min(6, index))
        if normalized not in unique_sorted:
            unique_sorted.append(normalized)

    candidate = 0
    while len(unique_sorted) < training_days:
        if candidate not in unique_sorted:
            unique_sorted.append(candidate)
        candidate += 1

    return sorted(unique_sorted)
