"""Workout RAG service — semantic exercise recommendations via pgvector."""

from __future__ import annotations

import logging
import os
from uuid import UUID

import httpx
from fastapi import HTTPException

from app.schemas.workout import ExerciseRecommendationResponse
from app.services.supabase_client import get_supabase

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1"


class WorkoutRAGService:
    """Retrieval-augmented exercise recommendation engine."""

    # ------------------------------------------------------------------
    # Embedding
    # ------------------------------------------------------------------
    async def _get_embedding_async(self, text: str) -> list[float]:
        """Generate a 1536-dim embedding via OpenRouter ada-002."""
        if not OPENROUTER_API_KEY:
            raise HTTPException(status_code=502, detail="OPENROUTER_API_KEY is not configured")

        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "openai/text-embedding-ada-002",
            "input": [text],
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(f"{OPENROUTER_URL}/embeddings", headers=headers, json=payload)
                resp.raise_for_status()
                return resp.json()["data"][0]["embedding"]
        except httpx.HTTPError as exc:
            logger.exception("Embedding API call failed")
            raise HTTPException(status_code=502, detail="Failed to generate query embedding") from exc

    # ------------------------------------------------------------------
    # Query building
    # ------------------------------------------------------------------
    def _build_query(
        self,
        user_profile: dict,
        physical_state_score: int,
        muscle_group: str | None = None,
    ) -> str:
        """Build a natural-language query string from user context."""
        fitness_level = user_profile.get("experience_level", "intermediate")
        goal = user_profile.get("goal", "general fitness")

        parts = [
            f"exercises for a {fitness_level} level person",
            f"goal: {goal}",
            f"physical readiness score: {physical_state_score}/100",
        ]
        if muscle_group:
            parts.append(f"targeting {muscle_group}")

        return ", ".join(parts)

    # ------------------------------------------------------------------
    # Vector search
    # ------------------------------------------------------------------
    async def _match_exercises(
        self,
        embedding: list[float],
        threshold: float,
        count: int,
    ) -> list[dict]:
        """Call the match_exercises_rag RPC for cosine similarity search."""
        try:
            sb = await get_supabase()
            response = await sb.rpc(
                "match_exercises_rag",
                {
                    "query_embedding": embedding,
                    "match_threshold": threshold,
                    "match_count": count,
                },
            ).execute()
            return response.data or []
        except Exception as exc:
            logger.exception("Vector DB query failed")
            raise HTTPException(
                status_code=503,
                detail="Exercise recommendation service temporarily unavailable",
            ) from exc

    # ------------------------------------------------------------------
    # Fallback
    # ------------------------------------------------------------------
    async def _fallback_direct_query(
        self,
        muscle_group: str | None,
        difficulty: str | None,
        limit: int,
    ) -> list[dict]:
        """Direct SELECT from exercises table when vector search yields too few results."""
        try:
            sb = await get_supabase()
            query = sb.table("exercises").select("*")
            if muscle_group:
                query = query.eq("muscle_group", muscle_group)
            if difficulty:
                query = query.eq("difficulty", difficulty)
            query = query.limit(limit)
            response = await query.execute()
            return response.data or []
        except Exception:
            logger.exception("Fallback exercise query failed")
            return []

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    async def get_recommendations(
        self,
        user_profile: dict,
        physical_state_score: int,
        muscle_group: str | None = None,
        difficulty: str | None = None,
        limit: int = 10,
    ) -> list[ExerciseRecommendationResponse]:
        """Return personalised exercise recommendations."""

        # 1. Build query string
        query_text = self._build_query(user_profile, physical_state_score, muscle_group)

        # 2. Embed query
        embedding = await self._get_embedding_async(query_text)

        # 3. Cosine similarity search (fetch extra to allow filtering)
        results = await self._match_exercises(embedding, threshold=0.50, count=limit * 3)

        # 4. Physical-state safety filter
        if physical_state_score < 45:
            results = [
                r for r in results
                if r.get("metadata", {}).get("difficulty", "intermediate") in ("beginner", "intermediate")
            ]

        # 5. Optional filters
        if muscle_group:
            results = [
                r for r in results
                if r.get("metadata", {}).get("target_muscle", "").lower() == muscle_group.lower()
            ]
        if difficulty:
            results = [
                r for r in results
                if r.get("metadata", {}).get("difficulty", "").lower() == difficulty.lower()
            ]

        # 6. Fallback when too few results
        if len(results) < 3:
            fallback = await self._fallback_direct_query(muscle_group, difficulty, limit)
            results = self._convert_fallback(fallback)

        # 7. Map to response models
        return [self._to_response(r) for r in results[:limit]]

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _to_response(row: dict) -> ExerciseRecommendationResponse:
        """Map a vector-search row to the response schema."""
        meta = row.get("metadata", {})
        if isinstance(meta, str):
            import json
            try:
                meta = json.loads(meta)
            except (json.JSONDecodeError, TypeError):
                meta = {}

        return ExerciseRecommendationResponse(
            id=row.get("id", "00000000-0000-0000-0000-000000000000"),
            name=row.get("name", "Unknown Exercise"),
            target_muscle=meta.get("target_muscle", ""),
            equipment=meta.get("equipment", []),
            execution_steps=meta.get("execution_steps", []),
            image_url=meta.get("image_url"),
            difficulty=meta.get("difficulty", "intermediate"),
            relevance_score=round(row.get("similarity", 0.0), 3),
        )

    @staticmethod
    def _convert_fallback(rows: list[dict]) -> list[dict]:
        """Normalise fallback rows to look like vector-search results."""
        converted = []
        for r in rows:
            converted.append({
                "id": r.get("id", "00000000-0000-0000-0000-000000000000"),
                "name": r.get("name", "Unknown Exercise"),
                "metadata": {
                    "target_muscle": r.get("muscle_group", ""),
                    "equipment": r.get("equipment", []),
                    "execution_steps": r.get("execution_steps", []),
                    "image_url": r.get("demonstration_url"),
                    "difficulty": r.get("difficulty", "intermediate"),
                },
                "similarity": 0.0,
            })
        return converted
