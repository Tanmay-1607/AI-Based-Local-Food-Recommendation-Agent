import json
import httpx
from typing import Optional, List, Dict, Any
from langchain_core.tools import tool
from app.recommender import recommender
from app.database import save_feedback, get_recent_feedback
from app.config import TAVILY_API_KEY, is_tavily_configured

@tool
def search_food_places(
    query: Optional[str] = None,
    locality: Optional[str] = None,
    cuisine: Optional[str] = None,
    food_type: Optional[str] = None
) -> str:
    """
    Search the local Nagpur food dataset by locality, cuisine, dish, or dietary food type (veg, non-veg, egg).
    Returns matching places with dish names, prices, and ratings.
    """
    q = (query or "").strip().lower()
    is_sweet = any(k in q for k in ["sweet", "sweets", "dessert", "desserts", "barfi", "mithai", "jalebi", "rabdi", "rabri", "ice cream", "kulfi", "sundae", "imarti", "jamun", "rasmalai"]) or (cuisine and "sweet" in cuisine.lower())
    
    target_cuisine = "Sweets & Desserts" if is_sweet else cuisine
    df = recommender.filter_places(
        locality=locality,
        cuisine=target_cuisine,
        food_type=food_type
    )

    if is_sweet:
        df = df[(df["cuisine"] == "Sweets & Desserts") & (df["spice_level"] == 1)]
    elif q:
        mask = (
            df["dish_name"].str.lower().str.contains(q, na=False) |
            df["description"].str.lower().str.contains(q, na=False) |
            df["cuisine"].str.lower().str.contains(q, na=False)
        )
        df = df[mask]

    records = df[["restaurant_id", "restaurant_name", "locality", "cuisine", "dish_name", "price", "food_type", "rating", "spice_level"]].to_dict(orient="records")
    return json.dumps(records[:12], indent=2)

@tool
def filter_by_budget(
    max_budget: float, 
    food_type: Optional[str] = None, 
    locality: Optional[str] = None,
    cuisine: Optional[str] = None,
    query: Optional[str] = None
) -> str:
    """
    Return only food options strictly within the user's specified budget limit (in INR ₹).
    Optionally filter by food_type ('veg', 'non-veg'), locality, and cuisine.
    """
    q = (query or "").strip().lower()
    is_sweet = any(k in q for k in ["sweet", "sweets", "dessert", "desserts", "barfi", "mithai", "jalebi", "rabdi", "rabri", "ice cream", "kulfi", "sundae", "imarti", "jamun", "rasmalai"]) or (cuisine and "sweet" in cuisine.lower())

    target_cuisine = "Sweets & Desserts" if is_sweet else cuisine
    df = recommender.filter_places(
        locality=locality,
        cuisine=target_cuisine,
        max_budget=max_budget,
        food_type=food_type
    )
    if is_sweet:
        df = df[(df["cuisine"] == "Sweets & Desserts") & (df["spice_level"] == 1)]

    records = df[["restaurant_id", "restaurant_name", "locality", "cuisine", "dish_name", "price", "rating", "food_type", "spice_level"]].to_dict(orient="records")
    return json.dumps(records[:12], indent=2)

@tool
def recommend_food(
    query: Optional[str] = "",
    locality: Optional[str] = None,
    cuisine: Optional[str] = None,
    max_budget: Optional[float] = None,
    food_type: Optional[str] = None,
    spice_level: Optional[int] = None,
    top_n: int = 5
) -> str:
    """
    Rank candidates using TF-IDF content similarity, budget fit, spice level, and user feedback.
    Returns ranked recommendations with match scores and explanations.
    """
    items = recommender.recommend(
        query=query,
        locality=locality,
        cuisine=cuisine,
        max_budget=max_budget,
        food_type=food_type,
        spice_level=spice_level,
        top_n=top_n
    )
    data = [item.model_dump() for item in items]
    return json.dumps(data, indent=2)

@tool
def get_food_details(restaurant_id: str) -> str:
    """
    Return comprehensive details about a selected restaurant or dish from the dataset using its restaurant_id (e.g. ngp_001).
    """
    details = recommender.get_place_by_id(restaurant_id)
    if not details:
        return json.dumps({"error": f"No food place found for ID {restaurant_id}"})
    return json.dumps(details, indent=2)

@tool
def save_user_feedback(
    restaurant_id: str,
    dish_name: str,
    feedback_type: str,
    rating: Optional[float] = None,
    comment: Optional[str] = None
) -> str:
    """
    Store user ratings, likes, and dislikes in SQLite to personalize future recommendations.
    feedback_type must be 'like', 'dislike', or 'rating'.
    """
    fid = save_feedback(
        restaurant_id=restaurant_id,
        dish_name=dish_name,
        feedback_type=feedback_type,
        rating=rating,
        comment=comment
    )
    return json.dumps({"status": "success", "feedback_id": fid, "message": "Feedback saved successfully."})

@tool
def search_web_tavily(query: str) -> str:
    """
    Search the live web using Tavily Search API for real-time recommendations, reviews, food blogs, or opening hours for Nagpur eateries.
    """
    if not is_tavily_configured():
        return json.dumps({"status": "info", "message": "Tavily API key not configured. Using local dataset."})

    try:
        nagpur_query = f"{query} Nagpur food" if "nagpur" not in query.lower() else query
        with httpx.Client(timeout=12.0) as client:
            resp = client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": TAVILY_API_KEY,
                    "query": nagpur_query,
                    "search_depth": "basic",
                    "include_answer": True,
                    "max_results": 3
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                results = []
                if data.get("answer"):
                    results.append({"type": "direct_answer", "content": data["answer"]})
                for r in data.get("results", [])[:3]:
                    results.append({
                        "title": r.get("title"),
                        "url": r.get("url"),
                        "snippet": r.get("content")
                    })
                return json.dumps(results, indent=2)
            else:
                return json.dumps({"error": f"Tavily returned HTTP {resp.status_code}: {resp.text}"})
    except Exception as e:
        return json.dumps({"error": f"Failed to execute Tavily web search: {str(e)}"})

ALL_TOOLS = [
    search_food_places,
    filter_by_budget,
    recommend_food,
    get_food_details,
    save_user_feedback,
    search_web_tavily
]
