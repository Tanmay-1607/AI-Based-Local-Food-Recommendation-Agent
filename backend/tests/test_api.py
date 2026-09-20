import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Nagpur" in data["location"]
    assert data["dataset_records"] >= 30

def test_metadata_endpoint():
    response = client.get("/api/meta")
    assert response.status_code == 200
    data = response.json()
    assert "Dharampeth" in data["localities"]
    assert "Saoji" in data["cuisines"]

def test_get_food_places():
    response = client.get("/api/food?locality=Dharampeth")
    assert response.status_code == 200
    items = response.json()
    assert len(items) > 0
    assert all(it["locality"] == "Dharampeth" for it in items)

def test_get_food_detail():
    response = client.get("/api/food/ngp_001")
    assert response.status_code == 200
    data = response.json()
    assert data["restaurant_id"] == "ngp_001"
    assert "Tarri Poha" in data["dish_name"]

def test_get_food_detail_not_found():
    response = client.get("/api/food/invalid_id_999")
    assert response.status_code == 404

def test_recommend_endpoint():
    payload = {
        "query": "fiery spicy non-veg lunch",
        "locality": "Mahal",
        "food_type": "non-veg",
        "max_budget": 500,
        "top_n": 5
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) > 0
    assert data["results"][0]["match_score"] > 0
    assert "why_recommended" in data["results"][0]

def test_chat_endpoint():
    payload = {
        "message": "Recommend spicy vegetarian food near Dharampeth under ₹200"
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 10
    assert "ai_mode" in data

def test_feedback_and_preferences():
    # Submit feedback
    fb_payload = {
        "restaurant_id": "ngp_003",
        "dish_name": "Ghee Roast Butter Masala Dosa",
        "feedback_type": "like",
        "rating": 5.0,
        "comment": "Crispy and authentic taste!"
    }
    fb_resp = client.post("/api/feedback", json=fb_payload)
    assert fb_resp.status_code == 200
    assert fb_resp.json()["status"] == "success"

    # Verify feedback listed
    list_resp = client.get("/api/feedback")
    assert list_resp.status_code == 200
    assert any(item["restaurant_id"] == "ngp_003" for item in list_resp.json())

    # Set user preferences
    pref_payload = {
        "preferred_locality": "Sadar",
        "max_budget": 350.0,
        "preferred_cuisine": "Mughlai",
        "food_type": "non-veg",
        "spice_level": 3
    }
    set_pref = client.post("/api/preferences", json=pref_payload)
    assert set_pref.status_code == 200

    get_pref = client.get("/api/preferences")
    assert get_pref.status_code == 200
    assert get_pref.json()["preferred_locality"] == "Sadar"
