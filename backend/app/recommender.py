import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.config import DATA_PATH
from app.database import get_feedback_weights
from app.schemas import RecommendationItem, FoodItem

class RecommenderEngine:
    def __init__(self, csv_path=None):
        self.csv_path = csv_path or DATA_PATH
        self.df = pd.DataFrame()
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
        self.tfidf_matrix = None
        self.load_data()

    def load_data(self):
        """Loads and prepares the dataset, fitting the TF-IDF representation."""
        self.df = pd.read_csv(self.csv_path)
        # Clean and type-cast
        self.df["price"] = pd.to_numeric(self.df["price"], errors="coerce").fillna(100.0)
        self.df["rating"] = pd.to_numeric(self.df["rating"], errors="coerce").fillna(4.0)
        self.df["spice_level"] = pd.to_numeric(self.df["spice_level"], errors="coerce").fillna(2).astype(int)
        self.df["food_type"] = self.df["food_type"].str.lower().str.strip()
        self.df["locality"] = self.df["locality"].str.strip()
        self.df["cuisine"] = self.df["cuisine"].str.strip()
        self.df["description"] = self.df["description"].fillna("")

        # Create rich content feature for vectorization
        self.df["content_features"] = (
            self.df["dish_name"] + " " +
            self.df["cuisine"] + " cuisine " +
            self.df["locality"] + " Nagpur " +
            self.df["food_type"] + " " +
            "spice " + self.df["spice_level"].astype(str) + " " +
            self.df["description"]
        ).str.lower()

        # Fit TF-IDF matrix
        self.tfidf_matrix = self.vectorizer.fit_transform(self.df["content_features"])

    def get_all_places(self) -> List[Dict[str, Any]]:
        return self.df.to_dict(orient="records")

    def get_place_by_id(self, restaurant_id: str) -> Optional[Dict[str, Any]]:
        matches = self.df[self.df["restaurant_id"].str.lower() == restaurant_id.lower()]
        if not matches.empty:
            return matches.iloc[0].to_dict()
        return None

    def get_unique_localities(self) -> List[str]:
        return sorted(self.df["locality"].dropna().unique().tolist())

    def get_unique_cuisines(self) -> List[str]:
        return sorted(self.df["cuisine"].dropna().unique().tolist())

    def filter_places(
        self,
        locality: Optional[str] = None,
        cuisine: Optional[str] = None,
        max_budget: Optional[float] = None,
        food_type: Optional[str] = None,
        min_rating: Optional[float] = None,
        spice_level: Optional[int] = None,
    ) -> pd.DataFrame:
        """Applies hard constraints onto the dataframe."""
        df_filtered = self.df.copy()

        if locality and locality.strip() and locality.lower() not in ["all", "any"]:
            df_filtered = df_filtered[df_filtered["locality"].str.lower() == locality.strip().lower()]

        if cuisine and cuisine.strip() and cuisine.lower() not in ["all", "any"]:
            df_filtered = df_filtered[df_filtered["cuisine"].str.lower() == cuisine.strip().lower()]

        if food_type and food_type.strip() and food_type.lower() not in ["all", "any"]:
            target_type = food_type.strip().lower()
            if target_type == "veg":
                df_filtered = df_filtered[df_filtered["food_type"] == "veg"]
            elif target_type == "non-veg":
                df_filtered = df_filtered[df_filtered["food_type"].isin(["non-veg", "egg"])]
            elif target_type == "egg":
                df_filtered = df_filtered[df_filtered["food_type"] == "egg"]

        if max_budget is not None and max_budget > 0:
            df_filtered = df_filtered[df_filtered["price"] <= max_budget]

        if min_rating is not None:
            df_filtered = df_filtered[df_filtered["rating"] >= min_rating]

        if spice_level is not None and spice_level > 0:
            df_filtered = df_filtered[
                (df_filtered["spice_level"] >= max(1, spice_level - 1)) &
                (df_filtered["spice_level"] <= min(5, spice_level + 1))
            ]

        return df_filtered

    def recommend(
        self,
        query: Optional[str] = "",
        locality: Optional[str] = None,
        cuisine: Optional[str] = None,
        max_budget: Optional[float] = None,
        food_type: Optional[str] = None,
        spice_level: Optional[int] = None,
        top_n: int = 8
    ) -> List[RecommendationItem]:
        """Calculates semantic similarity, strict intent constraints, budget fit, and user feedback."""
        raw_q = (query or "").strip().lower()

        # Semantic Intent Gating: Sweet vs Spicy vs Breakfast
        is_sweet_intent = any(k in raw_q for k in [
            "sweet", "sweets", "dessert", "desserts", "barfi", "mithai", "jalebi", "rabdi", "rabri", "ice cream", "kulfi", "sundae", "imarti", "jamun", "rasmalai", "rasgulla", "halwa", "ladoo", "laddu", "kaju"
        ]) or (cuisine and "sweet" in cuisine.lower())

        is_spicy_intent = any(k in raw_q for k in [
            "spicy", "hot", "fiery", "teekha", "tarri", "saoji"
        ]) or (cuisine and "saoji" in cuisine.lower())

        is_breakfast_intent = any(k in raw_q for k in [
            "breakfast", "nashta", "morning", "poha", "misal", "idli", "dosa"
        ])

        target_cuisine = cuisine
        if is_sweet_intent and not cuisine:
            target_cuisine = "Sweets & Desserts"
        elif is_spicy_intent and not cuisine:
            target_cuisine = "Saoji"

        # 1. Apply hard filters
        df_candidates = self.filter_places(
            locality=locality,
            cuisine=target_cuisine,
            max_budget=max_budget,
            food_type=food_type
        )

        # STRICT NEGATIVE GATING:
        # If user explicitly asked for SWEET: NEVER include dishes with spice_level >= 2 or savory items!
        if is_sweet_intent:
            df_candidates = df_candidates[
                (df_candidates["cuisine"] == "Sweets & Desserts") &
                (df_candidates["spice_level"] == 1)
            ]
            if df_candidates.empty:
                df_candidates = self.df[
                    (self.df["cuisine"] == "Sweets & Desserts") &
                    (self.df["spice_level"] == 1)
                ]

        # If user explicitly asked for SPICY: NEVER include Sweets & Desserts!
        elif is_spicy_intent:
            df_candidates = df_candidates[df_candidates["cuisine"] != "Sweets & Desserts"]
            df_candidates = df_candidates[df_candidates["spice_level"] >= 3]
            if df_candidates.empty:
                df_candidates = self.df[
                    (self.df["cuisine"] != "Sweets & Desserts") &
                    (self.df["spice_level"] >= 3)
                ]

        if df_candidates.empty:
            if is_sweet_intent:
                df_candidates = self.df[self.df["cuisine"] == "Sweets & Desserts"]
            elif is_spicy_intent:
                df_candidates = self.df[self.df["spice_level"] >= 3]
            else:
                df_candidates = self.filter_places(max_budget=max_budget, food_type=food_type)
                if df_candidates.empty:
                    df_candidates = self.df.copy()

        # 2. Compute similarity
        candidate_indices = df_candidates.index.tolist()
        candidate_tfidf = self.tfidf_matrix[candidate_indices]

        search_text_parts = []
        if raw_q:
            search_text_parts.append(raw_q)
        if target_cuisine and target_cuisine.lower() not in ["all", "any"]:
            search_text_parts.append(f"{target_cuisine} cuisine")
        if locality and locality.lower() not in ["all", "any"]:
            search_text_parts.append(f"{locality} Nagpur")
        if food_type and food_type.lower() not in ["all", "any"]:
            search_text_parts.append(food_type)

        combined_query = " ".join(search_text_parts).strip().lower()

        if combined_query:
            query_vector = self.vectorizer.transform([combined_query])
            sim_scores = cosine_similarity(query_vector, candidate_tfidf).flatten()
        else:
            sim_scores = np.full(len(candidate_indices), 0.5)

        # 3. User feedback bias
        feedback_weights = get_feedback_weights()
        liked_set = set(feedback_weights.get("liked_restaurants", []))
        disliked_set = set(feedback_weights.get("disliked_restaurants", []))

        results = []
        for idx, orig_idx in enumerate(candidate_indices):
            row = self.df.iloc[orig_idx]
            sim = float(sim_scores[idx])

            # If user entered a specific text query, enforce relevance:
            # If the dish has zero similarity to the text and doesn't match the targeted cuisine, skip it!
            if raw_q and sim < 0.04 and not (target_cuisine and row["cuisine"].lower() == target_cuisine.lower()):
                continue

            # Absolute categorical guardrails
            if is_sweet_intent and (row["cuisine"] != "Sweets & Desserts" or int(row["spice_level"]) > 1):
                continue
            if is_spicy_intent and (row["cuisine"] == "Sweets & Desserts" or int(row["spice_level"]) < 3):
                continue

            # Budget fit score
            price = float(row["price"])
            if max_budget and max_budget > 0:
                budget_ratio = price / max_budget
                budget_fit = max(0.2, 1.0 - (budget_ratio * 0.35))
            else:
                max_price = self.df["price"].max()
                budget_fit = 1.0 - (price / max_price) * 0.3

            # Rating score (3.0 -> 0.0, 5.0 -> 1.0)
            rating = float(row["rating"])
            rating_score = max(0.0, min(1.0, (rating - 3.0) / 2.0))

            # Spice fit score
            row_spice = int(row["spice_level"])
            if spice_level and spice_level > 0:
                spice_diff = abs(row_spice - spice_level)
                spice_fit = max(0.1, 1.0 - (spice_diff * 0.25))
            elif is_sweet_intent:
                spice_fit = 1.0 if row_spice == 1 else 0.0
            elif is_spicy_intent:
                spice_fit = 1.0 if row_spice >= 4 else (0.7 if row_spice == 3 else 0.0)
            else:
                spice_fit = 0.8

            # Feedback bonus/penalty: ONLY apply if dish is actually relevant to current search!
            rid = str(row["restaurant_id"])
            feedback_mod = 0.0
            is_relevant_to_query = (not raw_q) or (sim > 0.1) or (target_cuisine and row["cuisine"].lower() == target_cuisine.lower())
            if is_relevant_to_query:
                if rid in liked_set:
                    feedback_mod += 0.15
                elif rid in disliked_set:
                    feedback_mod -= 0.30

            # Composite Score
            if raw_q:
                raw_score = (0.50 * sim) + (0.20 * budget_fit) + (0.18 * rating_score) + (0.12 * spice_fit) + feedback_mod
            else:
                raw_score = (0.20 * sim) + (0.35 * budget_fit) + (0.30 * rating_score) + (0.15 * spice_fit) + feedback_mod

            match_percentage = round(min(99.0, max(42.0, raw_score * 100)), 1)

            # Generate natural language "Why Recommended"
            why_parts = []
            if is_sweet_intent:
                why_parts.append(f"Authentic Nagpur sweet delicacy (Spice {row_spice}/5)")
            elif is_spicy_intent:
                why_parts.append(f"Fiery spicy {row['cuisine']} specialty ({row_spice}/5 🌶️)")

            if locality and row["locality"].lower() == locality.lower():
                why_parts.append(f"Located in {row['locality']}")
            if target_cuisine and row["cuisine"].lower() == target_cuisine.lower() and not is_sweet_intent:
                why_parts.append(f"authentic {row['cuisine']}")
            if max_budget:
                diff = max_budget - price
                if diff > 0:
                    why_parts.append(f"₹{int(diff)} under your ₹{int(max_budget)} budget")
                else:
                    why_parts.append("within budget")
            if rating >= 4.7:
                why_parts.append(f"top-rated {rating}★ local favorite")
            if rid in liked_set and is_relevant_to_query:
                why_parts.append("matches places you previously liked")

            if not why_parts:
                why_text = f"Top {row['cuisine']} choice in {row['locality']} (₹{int(price)}), rating {rating}★."
            else:
                why_text = " • ".join(why_parts).capitalize() + "."

            item = RecommendationItem(
                restaurant_id=row["restaurant_id"],
                restaurant_name=row["restaurant_name"],
                locality=row["locality"],
                cuisine=row["cuisine"],
                dish_name=row["dish_name"],
                price=price,
                food_type=row["food_type"],
                spice_level=row_spice,
                rating=rating,
                description=row["description"],
                source=row.get("source", "Nagpur Local Food Guide (Demo Dataset)"),
                last_updated=str(row.get("last_updated", "2026-03-15")),
                match_score=match_percentage,
                similarity_score=round(sim, 3),
                budget_fit_score=round(budget_fit, 3),
                rating_score=round(rating_score, 3),
                spice_fit_score=round(spice_fit, 3),
                why_recommended=why_text,
            )
            results.append(item)

        if is_sweet_intent:
            results = [r for r in results if r.cuisine == "Sweets & Desserts" and r.spice_level == 1]
        elif is_spicy_intent:
            results = [r for r in results if r.cuisine != "Sweets & Desserts" and r.spice_level >= 3]

        # Sort by match score descending
        results.sort(key=lambda x: x.match_score, reverse=True)
        return results[:top_n]

# Singleton instance
recommender = RecommenderEngine()
