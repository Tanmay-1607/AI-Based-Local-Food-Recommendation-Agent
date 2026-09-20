import os
import sys
from pathlib import Path

# Add backend directory to sys.path so app modules import cleanly
sys.path.insert(0, str(Path(__file__).resolve().parent))

import gradio as gr
from app.recommender import recommender
from app.agent import agent_service
from app.config import is_groq_configured, is_tavily_configured, GROQ_MODEL

def chat_interface_fn(message, history):
    """Bridge Gradio chat with the LangChain / Fallback agent."""
    if not message:
        return ""
    # Format history into list of dicts
    formatted_history = []
    for h in history:
        if isinstance(h, (list, tuple)) and len(h) == 2:
            formatted_history.append({"role": "user", "content": str(h[0])})
            formatted_history.append({"role": "assistant", "content": str(h[1])})

    reply, items, tools_exec, mode = agent_service.chat(message, formatted_history)

    # Append tool execution trace if any
    tool_trace = ""
    if tools_exec:
        tool_trace = "\n\n> 🛠️ **Tools Executed:**\n" + "\n".join([f"> - `{t.tool}`: {t.summary}" for t in tools_exec])

    mode_badge = f"\n\n*(Engine: `{mode}`)*"
    return reply + tool_trace + mode_badge

def recommend_fn(craving, locality, cuisine, max_budget, food_type, spice_level):
    """Reuses the exact content-based recommender."""
    budget_val = float(max_budget) if max_budget and max_budget > 0 else None
    loc_val = None if locality in ["All Localities", ""] else locality
    cui_val = None if cuisine in ["All Cuisines", ""] else cuisine
    diet_val = None if food_type in ["All Diets", ""] else food_type

    items = recommender.recommend(
        query=craving,
        locality=loc_val,
        cuisine=cui_val,
        max_budget=budget_val,
        food_type=diet_val,
        spice_level=int(spice_level),
        top_n=6
    )

    if not items:
        return "No food places found matching all specified filters. Try relaxing your budget or locality!"

    markdown_output = []
    for idx, item in enumerate(items, 1):
        diet_icon = "🟢 Veg" if item.food_type == "veg" else ("🟡 Egg" if item.food_type == "egg" else "🔴 Non-Veg")
        spice_icons = "🌶️" * item.spice_level
        markdown_output.append(f"""
### {idx}. {item.dish_name} — ₹{int(item.price)}
**Restaurant**: {item.restaurant_name} ({item.locality}, Nagpur)  
**Match Score**: `{item.match_score}%` | **Rating**: ⭐ {item.rating} / 5.0 | **Diet**: {diet_icon} | **Spice**: {spice_icons} ({item.spice_level}/5)  
**Why Recommended**: *{item.why_recommended}*  
*{item.description}*  
---
""")
    return "\n".join(markdown_output)

def search_dataset_fn(search_text, locality_filter):
    loc = None if locality_filter in ["All", ""] else locality_filter
    df = recommender.filter_places(locality=loc)
    if search_text:
        s = search_text.lower()
        mask = (
            df["dish_name"].str.lower().str.contains(s, na=False) |
            df["restaurant_name"].str.lower().str.contains(s, na=False) |
            df["cuisine"].str.lower().str.contains(s, na=False)
        )
        df = df[mask]
    return df[["dish_name", "restaurant_name", "locality", "cuisine", "price", "food_type", "spice_level", "rating"]]

# Build Gradio UI
localities = ["All Localities"] + recommender.get_unique_localities()
cuisines = ["All Cuisines"] + recommender.get_unique_cuisines()

with gr.Blocks(title="LocalBite AI - Nagpur Food Playground") as demo:
    gr.Markdown("""
    # 🍲 LocalBite AI — Playground & Testing Lab
    ### AI-Powered Local Food Recommendation Agent for Nagpur, Maharashtra
    """)

    ai_status = f"🟢 Connected to Groq ({GROQ_MODEL})" if is_groq_configured() else "🟠 Running in Local Deterministic Content Mode"
    tavily_status = " | 🌐 Tavily Live Web Search Enabled" if is_tavily_configured() else ""
    gr.Markdown(f"**Agent Engine Status**: {ai_status}{tavily_status}")

    with gr.Tabs():
        with gr.TabItem("🤖 AI Chat Agent"):
            gr.Markdown("Chat naturally with LocalBite AI. Try asking: *'Recommend spicy vegetarian breakfast in Dharampeth under ₹150'*")
            gr.ChatInterface(
                fn=chat_interface_fn,
                examples=[
                    "Recommend spicy vegetarian food near Dharampeth under ₹200",
                    "Find Maharashtrian breakfast options under ₹100",
                    "I want fiery Saoji mutton in Mahal or Gandhibagh",
                    "Best South Indian crispy dosa under ₹180"
                ]
            )

        with gr.TabItem("🎯 Smart Recommender"):
            with gr.Row():
                with gr.Column(scale=1):
                    craving_input = gr.Textbox(label="Craving or Dish (Natural Language)", placeholder="e.g. spicy tarri poha, crispy dosa, butter chicken")
                    locality_input = gr.Dropdown(choices=localities, value="All Localities", label="Locality in Nagpur")
                    cuisine_input = gr.Dropdown(choices=cuisines, value="All Cuisines", label="Cuisine")
                    budget_input = gr.Slider(minimum=50, maximum=1000, value=250, step=25, label="Max Budget (₹)")
                    diet_input = gr.Radio(choices=["All Diets", "veg", "non-veg", "egg"], value="All Diets", label="Dietary Preference")
                    spice_input = gr.Slider(minimum=1, maximum=5, value=3, step=1, label="Spice Preference (1-5)")
                    recommend_btn = gr.Button("Generate AI Recommendations", variant="primary")
                with gr.Column(scale=2):
                    results_output = gr.Markdown(label="Ranked Recommendations")
            
            recommend_btn.click(
                fn=recommend_fn,
                inputs=[craving_input, locality_input, cuisine_input, budget_input, diet_input, spice_input],
                outputs=results_output
            )

        with gr.TabItem("📊 Nagpur Food Dataset"):
            with gr.Row():
                dataset_search = gr.Textbox(label="Search Dish or Restaurant", placeholder="Search...")
                dataset_loc = gr.Dropdown(choices=["All"] + recommender.get_unique_localities(), value="All", label="Filter Locality")
            data_table = gr.Dataframe(
                value=recommender.df[["dish_name", "restaurant_name", "locality", "cuisine", "price", "food_type", "spice_level", "rating"]],
                label="Authentic Nagpur Food Records (Demo Dataset)"
            )
            dataset_search.change(fn=search_dataset_fn, inputs=[dataset_search, dataset_loc], outputs=data_table)
            dataset_loc.change(fn=search_dataset_fn, inputs=[dataset_search, dataset_loc], outputs=data_table)

if __name__ == "__main__":
    demo.launch(server_name="127.0.0.1", server_port=7860, theme=gr.themes.Soft(primary_hue="emerald"))
