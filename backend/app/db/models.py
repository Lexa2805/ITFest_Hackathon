from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
import uuid

class RecipeEmbedding(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    source_url: Optional[str] = None
    embedding: List[float] # vector(1536)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class WeeklyPlan(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    week_start_date: date
    plan: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ShoppingList(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID
    recipe_ids: List[uuid.UUID] = Field(default_factory=list)
    items: Dict[str, Any] = Field(default_factory=dict) # Grouped by category
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class ExerciseEmbedding(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    name: str
    source_id: str
    embedding: List[float]  # vector(1536)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
