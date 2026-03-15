"""Unit tests for workout split service."""

import pytest
from datetime import datetime
from uuid import uuid4

from backend.app.services.workout_split_service import generate_split
from backend.app.schemas.profile import ProfileResponse
from backend.app.schemas.workout import ExerciseResponse


def test_generate_split_3_days_beginner_ppl():
    """Test that 3 days assigns Push/Pull/Legs split."""
    profile = ProfileResponse(
        user_id="test-user",
        goal="build muscle",
        experience_level="beginner",
        available_days_per_week=3,
    )
    
    result = generate_split(profile)
    
    assert result["split_type"] == "push_pull_legs"
    assert result["days_per_week"] == 3


def test_three_day_plan_is_spread_across_week():
    """Ensure 3 training days are spread, not packed at week start."""
    profile = ProfileResponse(
        user_id="test-user",
        goal="build muscle",
        experience_level="beginner",
        available_days_per_week=3,
    )

    result = generate_split(profile)
    training_days = [day.day_of_week for day in result["daily_workouts"] if not day.is_rest_day]

    assert training_days == [0, 3, 6]


def test_generate_split_4_days_upper_lower():
    """Test that 4 days assigns Upper/Lower split."""
    profile = ProfileResponse(
        user_id="test-user",
        goal="build muscle",
        experience_level="intermediate",
        available_days_per_week=4,
    )
    
    result = generate_split(profile)
    
    assert result["split_type"] == "upper_lower"
    assert result["days_per_week"] == 4


def test_generate_split_5_days_advanced_ppl():
    """Test that 5+ days + advanced assigns Push/Pull/Legs split."""
    profile = ProfileResponse(
        user_id="test-user",
        goal="build muscle",
        experience_level="advanced",
        available_days_per_week=5,
    )
    
    result = generate_split(profile)
    
    assert result["split_type"] == "push_pull_legs"
    assert result["days_per_week"] == 5


def test_generate_split_6_days_advanced_ppl():
    """Test that 6 days + advanced assigns Push/Pull/Legs split."""
    profile = ProfileResponse(
        user_id="test-user",
        goal="build muscle",
        experience_level="advanced",
        available_days_per_week=6,
    )
    
    result = generate_split(profile)
    
    assert result["split_type"] == "push_pull_legs"
    assert result["days_per_week"] == 6


def test_generate_split_5_days_intermediate_upper_lower():
    """Test that 5+ days + non-advanced assigns Upper/Lower for safety."""
    profile = ProfileResponse(
        user_id="test-user",
        goal="build muscle",
        experience_level="intermediate",
        available_days_per_week=5,
    )
    
    result = generate_split(profile)
    
    assert result["split_type"] == "upper_lower"
    assert result["days_per_week"] == 5


def test_rep_range_weight_loss():
    """Test that weight loss goal assigns 12-15 rep range."""
    profile = ProfileResponse(
        user_id="test-user",
        goal="lose weight",
        experience_level="beginner",
        available_days_per_week=3,
    )
    
    result = generate_split(profile)
    
    assert result["rep_range"] == (12, 15)


def test_rep_range_hypertrophy():
    """Test that build muscle goal assigns 8-12 rep range."""
    profile = ProfileResponse(
        user_id="test-user",
        goal="build muscle",
        experience_level="intermediate",
        available_days_per_week=4,
    )
    
    result = generate_split(profile)
    
    assert result["rep_range"] == (8, 12)


def test_rep_range_maintain():
    """Test that maintain goal assigns 10-12 rep range."""
    profile = ProfileResponse(
        user_id="test-user",
        goal="maintain",
        experience_level="beginner",
        available_days_per_week=3,
    )
    
    result = generate_split(profile)
    
    assert result["rep_range"] == (10, 12)


def test_rep_range_endurance():
    """Test that improve endurance goal assigns 12-15 rep range."""
    profile = ProfileResponse(
        user_id="test-user",
        goal="improve endurance",
        experience_level="beginner",
        available_days_per_week=3,
    )
    
    result = generate_split(profile)
    
    assert result["rep_range"] == (12, 15)


def test_missing_goal_raises_error():
    """Test that missing goal raises ValueError."""
    profile = ProfileResponse(
        user_id="test-user",
        goal=None,
        experience_level="beginner",
        available_days_per_week=3,
    )
    
    with pytest.raises(ValueError, match="User profile must have a goal set"):
        generate_split(profile)


def test_missing_available_days_raises_error():
    """Test that missing available_days_per_week raises ValueError."""
    profile = ProfileResponse(
        user_id="test-user",
        goal="build muscle",
        experience_level="beginner",
        available_days_per_week=None,
    )
    
    with pytest.raises(ValueError, match="User profile must have available_days_per_week set"):
        generate_split(profile)


def test_default_experience_level_beginner():
    """Test that missing experience_level defaults to beginner behavior."""
    profile = ProfileResponse(
        user_id="test-user",
        goal="build muscle",
        experience_level=None,
        available_days_per_week=5,
    )
    
    result = generate_split(profile)
    
    # 5 days + non-advanced should give upper_lower
    assert result["split_type"] == "upper_lower"


def test_edge_case_1_day():
    """Test edge case with 1 day per week."""
    profile = ProfileResponse(
        user_id="test-user",
        goal="maintain",
        experience_level="beginner",
        available_days_per_week=1,
    )
    
    result = generate_split(profile)
    
    assert result["split_type"] == "full_body"
    assert result["days_per_week"] == 1


def test_edge_case_7_days():
    """Test edge case with 7 days per week."""
    profile = ProfileResponse(
        user_id="test-user",
        goal="build muscle",
        experience_level="advanced",
        available_days_per_week=7,
    )
    
    result = generate_split(profile)
    
    assert result["split_type"] == "push_pull_legs"
    assert result["days_per_week"] == 7


def test_generated_plan_avoids_duplicate_exercises_across_training_days(monkeypatch):
    profile = ProfileResponse(
        user_id="test-user",
        goal="build muscle",
        experience_level="intermediate",
        available_days_per_week=4,
    )

    catalog: dict[tuple[str, str], list[ExerciseResponse]] = {}
    muscle_groups = [
        "chest",
        "back",
        "shoulders",
        "arms",
        "legs",
        "glutes",
        "hamstrings",
        "quadriceps",
        "calves",
        "core",
        "triceps",
        "biceps",
        "rear delts",
        "full body",
    ]

    for difficulty in ["beginner", "intermediate", "advanced"]:
        for muscle in muscle_groups:
            key = (muscle, difficulty)
            catalog[key] = [
                ExerciseResponse(
                    id=uuid4(),
                    name=f"{muscle}-{difficulty}-{index}",
                    demonstration_url=None,
                    execution_steps=["step 1"],
                    muscle_group=muscle,
                    equipment=[],
                    sets=3,
                    reps=10,
                    rest_seconds=60,
                    difficulty=difficulty,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                for index in range(1, 8)
            ]

    def fake_get_exercises_by_muscle_group(muscle_group: str, difficulty: str):
        return catalog.get((muscle_group, difficulty), [])

    monkeypatch.setattr(
        "backend.app.services.workout_split_service.get_exercises_by_muscle_group",
        fake_get_exercises_by_muscle_group,
    )

    result = generate_split(profile)
    training_days = [day for day in result["daily_workouts"] if not day.is_rest_day]
    all_ids = [str(ex.id) for day in training_days for ex in day.exercises]

    assert all(len(day.exercises) > 0 for day in training_days)
    assert len(all_ids) == len(set(all_ids))
