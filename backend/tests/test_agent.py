import json
import pytest
from app.tools import (
    search_food_places,
    filter_by_budget,
    recommend_food,
    get_food_details,
    save_user_feedback,
    search_web_tavily
)
from app.agent import agent_service

def test_tool_search_food_places():
    res_json = search_food_places.invoke({"query": "poha", "locality": "Dharampeth"})
    data = json.loads(res_json)
    assert isinstance(data, list)
    assert len(data) > 0
    assert any("poha" in it["dish_name"].lower() for it in data)

def test_tool_filter_by_budget():
    res_json = filter_by_budget.invoke({"max_budget": 120.0})
    data = json.loads(res_json)
    assert isinstance(data, list)
    assert len(data) > 0
    assert all(it["price"] <= 120.0 for it in data)

def test_tool_recommend_food():
    res_json = recommend_food.invoke({"query": "spicy breakfast", "locality": "Sitabuldi", "top_n": 3})
    data = json.loads(res_json)
    assert isinstance(data, list)
    assert len(data) <= 3
    assert data[0]["match_score"] > 0

def test_tool_get_food_details():
    res_json = get_food_details.invoke({"restaurant_id": "ngp_002"})
    data = json.loads(res_json)
    assert data["restaurant_id"] == "ngp_002"
    assert "Ramji Shyamji" in data["restaurant_name"]

def test_tool_save_user_feedback():
    res_json = save_user_feedback.invoke({
        "restaurant_id": "ngp_002",
        "dish_name": "Nagpuri Saoji Tarri Poha",
        "feedback_type": "like",
        "rating": 5.0,
        "comment": "Incredible spicy breakfast!"
    })
    data = json.loads(res_json)
    assert data["status"] == "success"
    assert "feedback_id" in data

def test_tool_search_web_tavily():
    res_json = search_web_tavily.invoke({"query": "Nagpur Tarri Poha"})
    data = json.loads(res_json)
    assert isinstance(data, list)
    assert len(data) > 0

def test_agent_query_parsing():
    parsed = agent_service.parse_query_intent("Recommend spicy vegetarian food near Dharampeth under ₹200")
    assert parsed["locality"] == "Dharampeth"
    assert parsed["max_budget"] == 200.0
    assert parsed["food_type"] == "veg"
    assert parsed["spice_level"] == 4

def test_agent_chat_response():
    reply, items, tools, mode = agent_service.chat("Find Maharashtrian breakfast options under ₹100")
    assert len(reply) > 20
    assert len(tools) > 0
    assert mode in ["groq_agent", "deterministic_local"]
