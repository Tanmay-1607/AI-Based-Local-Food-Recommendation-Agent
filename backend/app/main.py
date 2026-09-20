from datetime import datetime, timezone
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import is_groq_configured, is_tavily_configured, GROQ_MODEL
from app.recommender import recommender
from app.agent import agent_service
from app.database import (
    save_feedback,
    get_recent_feedback,
    save_user_preferences,
    get_user_preferences,
)
from app.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    ChatRequest,
    ChatResponse,
    FeedbackCreate,
    FeedbackItem,
    UserPreferences,
    FoodItem,
)

app = FastAPI(
    title="LocalBite AI API",
    description="AI-powered local food recommendation and agent API for Nagpur, India",
    version="1.0.0"
)

# Enable CORS for Vite frontend, Vercel deployments, Render, and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://ai-based-local-food-recommendation-agent.vercel.app",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app|.*\.onrender\.com)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    groq_active = is_groq_configured()
    tavily_active = is_tavily_configured()
    return {
        "status": "healthy",
        "service": "LocalBite AI",
        "location": "Nagpur, Maharashtra, India",
        "dataset_records": len(recommender.df),
        "ai_engine": f"Groq ({GROQ_MODEL})" if groq_active else "Deterministic Content Similarity Recommender",
        "groq_configured": groq_active,
        "tavily_configured": tavily_active,
        "model": GROQ_MODEL if groq_active else "rule-based-tfidf",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/api/meta")
def get_metadata():
    """Returns lists of localities, cuisines, and food types for filter dropdowns."""
    return {
        "localities": recommender.get_unique_localities(),
        "cuisines": recommender.get_unique_cuisines(),
        "food_types": ["all", "veg", "non-veg", "egg"],
        "spice_levels": [1, 2, 3, 4, 5],
        "default_locality": "Dharampeth"
    }

@app.get("/api/food", response_model=List[FoodItem])
def list_food_places(
    search: Optional[str] = None,
    locality: Optional[str] = None,
    cuisine: Optional[str] = None,
    food_type: Optional[str] = None,
    max_price: Optional[float] = None,
    spice_level: Optional[int] = None,
    sort_by: Optional[str] = Query(default="rating", pattern="^(rating|price_asc|price_desc|name)$"),
    limit: int = 50
):
    df = recommender.filter_places(
        locality=locality,
        cuisine=cuisine,
        food_type=food_type,
        max_budget=max_price,
        spice_level=spice_level
    )

    if search and search.strip():
        q = search.strip().lower()
        mask = (
            df["dish_name"].str.lower().str.contains(q, na=False) |
            df["restaurant_name"].str.lower().str.contains(q, na=False) |
            df["description"].str.lower().str.contains(q, na=False) |
            df["cuisine"].str.lower().str.contains(q, na=False)
        )
        df = df[mask]

    if sort_by == "rating":
        df = df.sort_values(by="rating", ascending=False)
    elif sort_by == "price_asc":
        df = df.sort_values(by="price", ascending=True)
    elif sort_by == "price_desc":
        df = df.sort_values(by="price", ascending=False)
    elif sort_by == "name":
        df = df.sort_values(by="dish_name", ascending=True)

    records = df.head(limit).to_dict(orient="records")
    return records

@app.get("/api/food/{restaurant_id}")
def get_food_detail(restaurant_id: str):
    place = recommender.get_place_by_id(restaurant_id)
    if not place:
        raise HTTPException(status_code=404, detail=f"Restaurant '{restaurant_id}' not found.")
    return place

@app.post("/api/recommend", response_model=RecommendationResponse)
def get_recommendations(req: RecommendationRequest):
    items = recommender.recommend(
        query=req.query,
        locality=req.locality,
        cuisine=req.cuisine,
        max_budget=req.max_budget,
        food_type=req.food_type,
        spice_level=req.spice_level,
        top_n=req.top_n
    )

    mode = "groq_agent_assisted" if is_groq_configured() else "content_similarity_local"
    return RecommendationResponse(
        results=items,
        total=len(items),
        ai_mode=mode,
        applied_filters={
            "query": req.query,
            "locality": req.locality,
            "cuisine": req.cuisine,
            "max_budget": req.max_budget,
            "food_type": req.food_type,
            "spice_level": req.spice_level
        }
    )

@app.post("/api/chat", response_model=ChatResponse)
def chat_with_agent(req: ChatRequest):
    history_dicts = [m.model_dump() for m in req.history] if req.history else []
    reply, items, tools_exec, mode = agent_service.chat(req.message, history_dicts)

    return ChatResponse(
        reply=reply,
        recommended_items=items,
        tools_executed=tools_exec,
        ai_mode=mode
    )

@app.post("/api/feedback")
def submit_feedback(fb: FeedbackCreate):
    fid = save_feedback(
        restaurant_id=fb.restaurant_id,
        dish_name=fb.dish_name,
        feedback_type=fb.feedback_type,
        rating=fb.rating,
        comment=fb.comment
    )
    return {
        "status": "success",
        "feedback_id": fid,
        "message": f"Feedback '{fb.feedback_type}' recorded successfully."
    }

@app.get("/api/feedback")
def list_feedback():
    return get_recent_feedback(50)

@app.get("/api/preferences")
def read_preferences():
    prefs = get_user_preferences()
    return prefs or {}

@app.post("/api/preferences")
def write_preferences(prefs: UserPreferences):
    save_user_preferences(prefs.model_dump())
    return {"status": "success", "message": "Preferences updated."}
