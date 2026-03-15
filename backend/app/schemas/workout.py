"""Schemas for workout domain models."""

from datetime import date as dt_date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ---------------------------------------------------------------------------
# Type Definitions
# ---------------------------------------------------------------------------
ExperienceLevel = Literal["beginner", "intermediate", "advanced"]
SplitType = Literal["full_body", "upper_lower", "push_pull_legs"]
Difficulty = Literal["beginner", "intermediate", "advanced"]


# ---------------------------------------------------------------------------
# Exercise
# ---------------------------------------------------------------------------
class ExerciseBase(BaseModel):
    """Base exercise model with core fields."""
    
    name: str = Field(..., description="Exercise name")
    demonstration_url: str | None = Field(
        default=None, description="URL to demonstration photo or GIF"
    )
    execution_steps: list[str] = Field(
        default_factory=list, description="Numbered execution instructions"
    )
    muscle_group: str = Field(..., description="Primary muscle group targeted")
    equipment: list[str] = Field(
        default_factory=list, description="Required equipment"
    )
    sets: int = Field(..., ge=1, le=10, description="Number of sets")
    reps: int = Field(..., ge=1, le=50, description="Number of repetitions")
    rest_seconds: int = Field(
        default=60, ge=30, le=300, description="Rest time between sets in seconds"
    )
    difficulty: Difficulty = Field(..., description="Exercise difficulty level")


class ExerciseResponse(ExerciseBase):
    """Exercise model with database fields."""
    
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Daily Workout
# ---------------------------------------------------------------------------
class DailyWorkout(BaseModel):
    """Represents a single day's workout in a weekly plan."""
    
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    muscle_group: str | None = Field(
        default=None, description="Primary muscle group for the day"
    )
    is_rest_day: bool = Field(default=False, description="Whether this is a rest day")
    exercises: list[ExerciseResponse] = Field(
        default_factory=list, description="List of exercises for the day"
    )


# ---------------------------------------------------------------------------
# Workout Plan
# ---------------------------------------------------------------------------
class WorkoutPlanCreate(BaseModel):
    """Request model for creating a workout plan."""
    
    week_start_date: dt_date = Field(..., description="Start date of the week (Monday)")
    split_type: SplitType = Field(..., description="Type of training split")
    daily_workouts: list[DailyWorkout] = Field(
        ..., description="7-day workout structure"
    )


class WorkoutPlanResponse(WorkoutPlanCreate):
    """Workout plan model with database fields."""
    
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Workout Completion
# ---------------------------------------------------------------------------
class WorkoutCompletionCreate(BaseModel):
    """Request model for marking a workout as complete."""
    
    workout_plan_id: UUID = Field(..., description="ID of the workout plan")
    date: dt_date = Field(..., description="Date of completion")
    day_of_week: int = Field(..., ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    exercise_id: UUID | None = Field(
        default=None,
        description="Optional exercise ID for per-exercise completion; null means whole-day completion",
    )


class WorkoutCompletionResponse(WorkoutCompletionCreate):
    """Workout completion model with database fields."""
    
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    completed_at: datetime


# ---------------------------------------------------------------------------
# Exercise Recommendation (RAG)
# ---------------------------------------------------------------------------
class ExerciseRecommendationResponse(BaseModel):
    """Response model for RAG-powered exercise recommendations."""

    id: UUID
    name: str
    target_muscle: str
    equipment: list[str] = Field(default_factory=list)
    execution_steps: list[str] = Field(default_factory=list)
    image_url: str | None = None
    difficulty: str
    relevance_score: float
