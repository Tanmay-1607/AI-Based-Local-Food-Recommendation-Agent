from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class FoodItem(BaseModel):
    restaurant_id: str
    restaurant_name: str
    locality: str
    cuisine: str
    dish_name: str
    price: float
    food_type: str = Field(description="veg, non-veg, or egg")
    spice_level: int = Field(ge=1, le=5)
    rating: float = Field(ge=1.0, le=5.0)
    description: str
    source: str = "Nagpur Local Food Guide (Demo Dataset)"
    last_updated: str = "2026-03-15"

class RecommendationItem(FoodItem):
    match_score: float = Field(description="Normalized 0-100 percentage match score")
    similarity_score: float = 0.0
    budget_fit_score: float = 0.0
    rating_score: float = 0.0
    spice_fit_score: float = 0.0
    why_recommended: str = ""

class RecommendationRequest(BaseModel):
    query: Optional[str] = ""
    locality: Optional[str] = None
    cuisine: Optional[str] = None
    max_budget: Optional[float] = None
    food_type: Optional[str] = None
    spice_level: Optional[int] = None
    top_n: int = 8

class RecommendationResponse(BaseModel):
    results: List[RecommendationItem]
    total: int
    ai_mode: str
    applied_filters: Dict[str, Any]

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None
    current_preferences: Optional[Dict[str, Any]] = None

class ToolExecutionInfo(BaseModel):
    tool: str
    args: Dict[str, Any]
    summary: str

class ChatResponse(BaseModel):
    reply: str
    recommended_items: List[RecommendationItem] = []
    tools_executed: List[ToolExecutionInfo] = []
    ai_mode: str

class FeedbackCreate(BaseModel):
    restaurant_id: str
    dish_name: str
    feedback_type: str = Field(pattern="^(like|dislike|rating)$")
    rating: Optional[float] = Field(default=None, ge=1.0, le=5.0)
    comment: Optional[str] = None

class FeedbackItem(FeedbackCreate):
    id: int
    created_at: str

class UserPreferences(BaseModel):
    preferred_locality: Optional[str] = None
    max_budget: Optional[float] = None
    preferred_cuisine: Optional[str] = None
    food_type: Optional[str] = None
    spice_level: Optional[int] = None
