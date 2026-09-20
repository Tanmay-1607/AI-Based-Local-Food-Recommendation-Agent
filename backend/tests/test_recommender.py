import pytest
from app.recommender import recommender
from app.database import save_feedback, init_db

def setup_module():
    init_db()

def test_dataset_loaded():
    assert len(recommender.df) >= 30
    assert "dish_name" in recommender.df.columns
    assert "price" in recommender.df.columns
    assert "locality" in recommender.df.columns

def test_budget_filtering():
    max_budget = 100.0
    filtered = recommender.filter_places(max_budget=max_budget)
    assert not filtered.empty
    assert (filtered["price"] <= max_budget).all()

def test_cuisine_filtering():
    filtered = recommender.filter_places(cuisine="Saoji")
    assert not filtered.empty
    assert (filtered["cuisine"].str.lower() == "saoji").all()

def test_dietary_filtering_veg():
    filtered = recommender.filter_places(food_type="veg")
    assert not filtered.empty
    assert (filtered["food_type"] == "veg").all()

def test_dietary_filtering_non_veg():
    filtered = recommender.filter_places(food_type="non-veg")
    assert not filtered.empty
    assert (filtered["food_type"].isin(["non-veg", "egg"])).all()

def test_recommendation_ranking_and_scores():
    items = recommender.recommend(query="spicy breakfast", locality="Dharampeth", max_budget=200, top_n=5)
    assert len(items) > 0
    # Highest score must come first
    scores = [item.match_score for item in items]
    assert scores == sorted(scores, reverse=True)
    # Check that why_recommended explanation is populated
    assert items[0].why_recommended != ""
    assert items[0].price <= 200

def test_empty_query_fallback():
    # Calling recommend with no query should return valid diverse recommendations
    items = recommender.recommend(query="", top_n=4)
    assert len(items) == 4
    assert items[0].match_score > 0

def test_feedback_personalization_boost():
    # Save a like for ngp_001
    save_feedback(restaurant_id="ngp_001", dish_name="Keshav Tarri Poha", feedback_type="like")
    # Score should be calculated with feedback weights
    items = recommender.recommend(locality="Dharampeth", top_n=10)
    ngp_001_item = next((it for it in items if it.restaurant_id == "ngp_001"), None)
    assert ngp_001_item is not None
    assert "liked" in ngp_001_item.why_recommended or ngp_001_item.match_score > 50

def test_sweet_vs_spicy_intent_separation():
    # 1. Sweet query should NEVER return spicy/savory dishes
    sweet_items = recommender.recommend(query="sweet dessert", top_n=8)
    assert len(sweet_items) > 0
    for item in sweet_items:
        assert item.cuisine == "Sweets & Desserts", f"Expected Sweets & Desserts, got {item.cuisine} ({item.dish_name})"
        assert item.spice_level == 1, f"Expected spice 1 for sweet, got {item.spice_level} ({item.dish_name})"

    # 2. Spicy query should NEVER return sweets
    spicy_items = recommender.recommend(query="spicy fiery saoji", top_n=8)
    assert len(spicy_items) > 0
    for item in spicy_items:
        assert item.cuisine != "Sweets & Desserts", f"Spicy query returned sweet {item.dish_name}"
        assert item.spice_level >= 3, f"Expected spice >= 3 for spicy query, got {item.spice_level} ({item.dish_name})"
