"""Schemas for the Life Score feature."""

from __future__ import annotations

from pydantic import BaseModel

VALID_GRADES: set[str] = {
    "A+", "A", "A-",
    "B+", "B", "B-",
    "C+", "C", "C-",
    "D+", "D", "D-",
    "F",
}


class MetricsSnapshot(BaseModel):
    """Health metrics and profile values captured at score generation time."""

    avg_heart_rate_bpm: float
    avg_daily_steps: float
    avg_nightly_sleep_hours: float
    avg_hrv_sdnn_ms: float
    avg_daily_active_energy_kcal: float
    weight_kg: float
    height_cm: float
    age: int
    gender: str
    bmi: float


class LifeScoreResponse(BaseModel):
    """Response model for a persisted Life Score record."""

    id: str
    score: str
    summary: str
    top_strengths: list[str]
    areas_for_improvement: list[str]
    metrics_snapshot: MetricsSnapshot
    created_at: str


class LifeScoreGenerateError(BaseModel):
    """Error response body for Life Score generation failures."""

    detail: str
