import sqlite3
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.config import DB_PATH

def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Feedback table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        restaurant_id TEXT NOT NULL,
        dish_name TEXT NOT NULL,
        feedback_type TEXT NOT NULL,
        rating REAL,
        comment TEXT,
        created_at TEXT NOT NULL
    );
    """)
    
    # Preferences table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        preferred_locality TEXT,
        max_budget REAL,
        preferred_cuisine TEXT,
        food_type TEXT,
        spice_level INTEGER,
        updated_at TEXT NOT NULL
    );
    """)
    
    conn.commit()
    conn.close()

def save_feedback(restaurant_id: str, dish_name: str, feedback_type: str, rating: Optional[float] = None, comment: Optional[str] = None) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    created_at = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO user_feedback (restaurant_id, dish_name, feedback_type, rating, comment, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (restaurant_id, dish_name, feedback_type, rating, comment, created_at))
    feedback_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return feedback_id

def get_recent_feedback(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_feedback ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    results = [dict(row) for row in rows]
    conn.close()
    return results

def get_feedback_weights() -> Dict[str, Any]:
    """Returns feedback stats used to bias recommendations: liked/disliked restaurants."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT restaurant_id, feedback_type, rating FROM user_feedback")
    rows = cursor.fetchall()
    conn.close()
    
    liked_restaurants = set()
    disliked_restaurants = set()
    for row in rows:
        rtype = row["feedback_type"]
        rid = row["restaurant_id"]
        if rtype == "like" or (row["rating"] and row["rating"] >= 4.0):
            liked_restaurants.add(rid)
        elif rtype == "dislike" or (row["rating"] and row["rating"] <= 2.0):
            disliked_restaurants.add(rid)
            
    return {
        "liked_restaurants": list(liked_restaurants),
        "disliked_restaurants": list(disliked_restaurants),
    }

def save_user_preferences(prefs: Dict[str, Any]) -> None:
    conn = get_connection()
    cursor = conn.cursor()
    updated_at = datetime.now(timezone.utc).isoformat()
    cursor.execute("DELETE FROM user_preferences")
    cursor.execute("""
        INSERT INTO user_preferences (preferred_locality, max_budget, preferred_cuisine, food_type, spice_level, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        prefs.get("preferred_locality"),
        prefs.get("max_budget"),
        prefs.get("preferred_cuisine"),
        prefs.get("food_type"),
        prefs.get("spice_level"),
        updated_at
    ))
    conn.commit()
    conn.close()

def get_user_preferences() -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_preferences ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

# Initialize on import
init_db()
