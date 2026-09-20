import json
import urllib.request

def run_verification():
    print("=== 1. Checking Health Endpoint ===")
    with urllib.request.urlopen("http://127.0.0.1:8000/api/health") as resp:
        h = json.loads(resp.read().decode("utf-8"))
        print(f"Status: {h['status']}, Records: {h['dataset_records']}")
        print(f"AI Engine: {h['ai_engine']}, Groq: {h['groq_configured']}, Tavily: {h['tavily_configured']}")

    print("\n=== 2. Testing Query: Spicy Veg in Dharampeth under 200 (with Groq tool calling) ===")
    payload = {
        "message": "Recommend spicy vegetarian food near Dharampeth under 200"
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        chat_res = json.loads(resp.read().decode("utf-8"))
        print(f"AI Mode: {chat_res['ai_mode']}")
        print(f"Tools Count: {len(chat_res['tools_executed'])}")
        for t in chat_res['tools_executed']:
            print(f"  Executed Tool: {t['tool']} with args {t['args']}")
        print("Reply excerpt:\n", chat_res["reply"][:250])

    print("\n=== 3. Testing Live Web Search via Tavily ===")
    tavily_payload = {
        "message": "Search online using Tavily for the most famous food blogs in Nagpur"
    }
    tavily_req = urllib.request.Request(
        "http://127.0.0.1:8000/api/chat",
        data=json.dumps(tavily_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(tavily_req) as resp:
        tavily_res = json.loads(resp.read().decode("utf-8"))
        print(f"AI Mode: {tavily_res['ai_mode']}")
        print(f"Tools Count: {len(tavily_res['tools_executed'])}")
        for t in tavily_res['tools_executed']:
            print(f"  Executed Tool: {t['tool']} with args {t['args']}")
        print("Reply excerpt:\n", tavily_res["reply"][:250])

    print("\n=== 4. Testing Feedback Personalization Loop ===")
    fb_payload = {
        "restaurant_id": "ngp_005",
        "dish_name": "Special Saoji Mutton Thali",
        "feedback_type": "like",
        "rating": 5.0,
        "comment": "Favorite fiery meal in Mahal!"
    }
    fb_req = urllib.request.Request(
        "http://127.0.0.1:8000/api/feedback",
        data=json.dumps(fb_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(fb_req) as resp:
        fb_res = json.loads(resp.read().decode("utf-8"))
        print("Feedback saved response:", fb_res)

    print("\n=== 5. Testing Recommender with Liked Boost ===")
    rec_payload = {
        "query": "Saoji spicy food",
        "food_type": "non-veg",
        "top_n": 2
    }
    rec_req = urllib.request.Request(
        "http://127.0.0.1:8000/api/recommend",
        data=json.dumps(rec_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(rec_req) as resp:
        rec_res = json.loads(resp.read().decode("utf-8"))
        for it in rec_res["results"]:
            print(f"- {it['dish_name']} @ {it['restaurant_name']} ({it['locality']}) => Match: {it['match_score']}%")
            print(f"  Why: {it['why_recommended']}")

if __name__ == "__main__":
    run_verification()
