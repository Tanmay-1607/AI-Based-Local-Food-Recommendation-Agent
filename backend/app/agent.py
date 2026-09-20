import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from groq import Groq
from app.config import GROQ_API_KEY, GROQ_MODEL, is_groq_configured, is_tavily_configured
from app.tools import (
    search_food_places,
    filter_by_budget,
    recommend_food,
    get_food_details,
    save_user_feedback,
    search_web_tavily
)
from app.recommender import recommender
from app.schemas import RecommendationItem, ToolExecutionInfo

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are LocalBite AI, an expert local food recommendation and discovery concierge specializing in Nagpur, Maharashtra, India.
Your mission is to help users discover authentic, delicious local food and restaurants matching their exact cravings, budget, dietary choices, and locality.

CRITICAL RULES:
1. SWEET vs SPICY SEPARATION:
   - When the user asks for sweets, desserts, barfi, jalebi, rabdi, ice cream, or mithai, ALWAYS recommend dishes from 'Sweets & Desserts' (spice level 1). NEVER mention or recommend spicy savory dishes (like Saoji, Tarri Poha, or Biryani) when sweet food is requested!
   - When the user asks for spicy, teekha, or fiery food, recommend 'Saoji' or spicy 'Street Food' (spice level 3-5). NEVER recommend sweets or desserts for spicy queries!
2. TOOLS TO USE:
   - `recommend_food`: Your primary tool for recommending dishes. It ranks by semantic similarity, budget fit, and ratings. Always use `recommend_food` first.
   - `search_web_tavily`: Live web search powered by Tavily for latest food blogs, reviews, opening timings, and recent Nagpur eateries.
   - `filter_by_budget`: Strictly filters options within a user's budget ceiling in ₹. If user wants sweets under a budget, pass cuisine='Sweets & Desserts'!
   - `get_food_details`: Returns specific details about a restaurant ID.
3. PARAMETER FORMAT:
   - If an optional argument is not specified by the user, you may pass null or omit it.
4. Ground your responses strictly in the tool outputs. Never invent or mix up spicy dishes when the user asks for desserts.
"""

GROQ_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "recommend_food",
            "description": "Rank food candidates in Nagpur using TF-IDF content similarity, budget fit, and user feedback.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": ["string", "null"], "description": "Free text craving e.g. sweet dessert, spicy saoji, breakfast"},
                    "locality": {"type": ["string", "null"], "description": "Locality in Nagpur e.g. Dharampeth, Sadar, Sitabuldi, Mahal, Ramdaspeth"},
                    "cuisine": {"type": ["string", "null"], "description": "Cuisine type: 'Sweets & Desserts', 'Saoji', 'Maharashtrian', 'South Indian', 'North Indian', 'Street Food', 'Mughlai', 'Fast Food'"},
                    "max_budget": {"type": ["number", "null"], "description": "Maximum budget ceiling in INR ₹"},
                    "food_type": {"type": ["string", "null"], "description": "veg, non-veg, or egg"},
                    "spice_level": {"type": ["integer", "null"], "description": "Spice tolerance from 1 (sweet/mild) to 5 (extra spicy)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "filter_by_budget",
            "description": "Return food options strictly within the specified budget ceiling in ₹.",
            "parameters": {
                "type": "object",
                "properties": {
                    "max_budget": {"type": "number", "description": "Budget limit in INR ₹"},
                    "cuisine": {"type": ["string", "null"], "description": "Optional cuisine type e.g. 'Sweets & Desserts'"},
                    "query": {"type": ["string", "null"], "description": "Optional search term e.g. 'sweet', 'barfi'"},
                    "food_type": {"type": ["string", "null"], "description": "Optional dietary preference (veg, non-veg)"},
                    "locality": {"type": ["string", "null"], "description": "Optional Nagpur locality"}
                },
                "required": ["max_budget"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_food_places",
            "description": "Search the local Nagpur dataset by dish name, cuisine, or locality.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": ["string", "null"], "description": "Search keyword or dish name"},
                    "locality": {"type": ["string", "null"], "description": "Locality"},
                    "cuisine": {"type": ["string", "null"], "description": "Cuisine"},
                    "food_type": {"type": ["string", "null"], "description": "veg or non-veg"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_food_details",
            "description": "Get complete details about a specific restaurant/dish by restaurant ID (e.g. ngp_001).",
            "parameters": {
                "type": "object",
                "properties": {
                    "restaurant_id": {"type": "string", "description": "ID e.g. ngp_001"}
                },
                "required": ["restaurant_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_web_tavily",
            "description": "Live web search powered by Tavily for real-time reviews, food blogs, or opening timings for Nagpur food.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Web search query for Nagpur food"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_user_feedback",
            "description": "Store user like, dislike, or rating into SQLite.",
            "parameters": {
                "type": "object",
                "properties": {
                    "restaurant_id": {"type": "string"},
                    "dish_name": {"type": "string"},
                    "feedback_type": {"type": "string", "enum": ["like", "dislike", "rating"]},
                    "rating": {"type": ["number", "null"]},
                    "comment": {"type": ["string", "null"]}
                },
                "required": ["restaurant_id", "dish_name", "feedback_type"]
            }
        }
    }
]

class FoodAgentService:
    def __init__(self):
        self.groq_client = None
        self._init_client()

    def _init_client(self):
        if is_groq_configured():
            try:
                self.groq_client = Groq(api_key=GROQ_API_KEY)
                logger.info("Initialized Groq client with model %s", GROQ_MODEL)
            except Exception as e:
                logger.warning("Failed to init Groq client: %s", e)
                self.groq_client = None

    def parse_query_intent(self, text: str) -> Dict[str, Any]:
        """Extracts structured entities from natural language queries for deterministic fallback."""
        lowered = text.lower()

        budget = None
        budget_match = re.search(r'(?:under|below|budget|within|less than|max)\s*₹?\s*(\d+)', lowered)
        if not budget_match:
            budget_match = re.search(r'₹\s*(\d+)', lowered)
        if budget_match:
            try:
                budget = float(budget_match.group(1))
            except ValueError:
                budget = None

        localities = recommender.get_unique_localities()
        matched_locality = None
        for loc in localities:
            if loc.lower() in lowered:
                matched_locality = loc
                break

        cuisines = recommender.get_unique_cuisines()
        matched_cuisine = None
        for cui in cuisines:
            if cui.lower() in lowered:
                matched_cuisine = cui
                break

        is_sweet = any(k in lowered for k in [
            "sweet", "sweets", "barfi", "jalebi", "rabdi", "rabri", "dessert", "desserts", "mithai", 
            "ice cream", "kulfi", "rasmalai", "rasgulla", "halwa", "ladoo", "laddu", "kaju", "jamun", "imarti", "sundae"
        ])
        if is_sweet:
            matched_cuisine = "Sweets & Desserts"

        if not matched_cuisine:
            if "saoji" in lowered:
                matched_cuisine = "Saoji"
            elif "poha" in lowered or "tarri" in lowered:
                matched_cuisine = "Street Food"
            elif "misal" in lowered or "thalipeeth" in lowered:
                matched_cuisine = "Maharashtrian"
            elif "dosa" in lowered or "idli" in lowered:
                matched_cuisine = "South Indian"
            elif "biryani" in lowered or "kebab" in lowered:
                matched_cuisine = "Mughlai"

        is_non_veg = (
            bool(re.search(r'\bnon[\s-]?veg\b', lowered)) or
            any(w in lowered for w in ["chicken", "mutton", "lamb", "fish", "prawns", "kebab", "meat", "shawarma"])
        )
        is_egg = bool(re.search(r'\begg\b', lowered))
        is_pure_veg = (
            bool(re.search(r'\bpure[\s-]?veg\b', lowered)) or
            bool(re.search(r'\bvegetarian\b', lowered)) or
            (bool(re.search(r'\bveg\b', lowered)) and not is_non_veg)
        )

        food_type = None
        if is_sweet:
            food_type = "veg"
        elif is_non_veg:
            food_type = "non-veg"
        elif is_egg:
            food_type = "egg"
        elif is_pure_veg:
            food_type = "veg"

        spice_level = None
        if is_sweet:
            spice_level = 1
        elif "extra spicy" in lowered or "very spicy" in lowered or "fiery" in lowered:
            spice_level = 5
        elif "spicy" in lowered or "hot" in lowered:
            spice_level = 4
        elif "mild" in lowered or "non-spicy" in lowered:
            spice_level = 1
        elif "medium" in lowered:
            spice_level = 3

        return {
            "locality": matched_locality,
            "cuisine": matched_cuisine,
            "max_budget": budget,
            "food_type": food_type,
            "spice_level": spice_level,
            "raw_query": text
        }

    def execute_deterministic(self, message: str) -> Tuple[str, List[RecommendationItem], List[ToolExecutionInfo]]:
        """Deterministic agent calling tools directly."""
        tools_executed: List[ToolExecutionInfo] = []
        entities = self.parse_query_intent(message)

        # Web search intent
        lowered = message.lower()
        if is_tavily_configured() and any(w in lowered for w in ["web", "online", "blog", "latest", "timing", "article", "tavily"]):
            raw_web = search_web_tavily.invoke({"query": message})
            tools_executed.append(ToolExecutionInfo(
                tool="search_web_tavily",
                args={"query": message},
                summary=f"Searched live web via Tavily for '{message}'"
            ))
            try:
                web_results = json.loads(raw_web)
                snippets = []
                for r in web_results:
                    if r.get("type") == "direct_answer":
                        snippets.append(f"**Direct Answer:** {r['content']}")
                    elif r.get("title"):
                        snippets.append(f"- [{r['title']}]({r.get('url', '#')}): {r.get('snippet', '')}")
                if snippets:
                    reply = "Here is what I found from live web search via Tavily for Nagpur food:\n\n" + "\n".join(snippets)
                    return reply, [], tools_executed
            except Exception:
                pass

        # ID lookup
        id_match = re.search(r'(ngp_\d{3})', message.lower())
        if id_match:
            rid = id_match.group(1)
            raw_details = get_food_details.invoke({"restaurant_id": rid})
            tools_executed.append(ToolExecutionInfo(
                tool="get_food_details",
                args={"restaurant_id": rid},
                summary=f"Retrieved food details for {rid}"
            ))
            details = json.loads(raw_details)
            if "error" in details:
                return f"I couldn't find details for restaurant ID {rid}.", [], tools_executed
            reply = (
                f"### {details['dish_name']} at {details['restaurant_name']}\n\n"
                f"- **Locality**: {details['locality']}, Nagpur\n"
                f"- **Cuisine**: {details['cuisine']} ({details['food_type'].upper()})\n"
                f"- **Price**: ₹{details['price']}\n"
                f"- **Spice Level**: {'🌶️' * details['spice_level']} ({details['spice_level']}/5)\n"
                f"- **Rating**: ⭐ {details['rating']}/5.0\n\n"
                f"*{details['description']}*"
            )
            return reply, [], tools_executed

        # Recommendation tool execution
        rec_args = {
            "query": message,
            "locality": entities["locality"],
            "cuisine": entities["cuisine"],
            "max_budget": entities["max_budget"],
            "food_type": entities["food_type"],
            "spice_level": entities["spice_level"],
            "top_n": 5
        }
        raw_rec = recommend_food.invoke(rec_args)
        tools_executed.append(ToolExecutionInfo(
            tool="recommend_food",
            args=rec_args,
            summary=f"Ran TF-IDF recommender with: {entities['cuisine'] or 'Nagpur food'}, {entities['locality'] or 'All Nagpur'}, budget ₹{entities['max_budget'] or 'Any'}"
        ))

        rec_dicts = json.loads(raw_rec)
        items = [RecommendationItem(**d) for d in rec_dicts]

        if not items:
            reply = "I couldn't find matching food places in our Nagpur dataset for those exact constraints. Try broadening your budget or choosing another category!"
            return reply, [], tools_executed

        top_item = items[0]
        locality_str = f" in **{entities['locality']}**" if entities['locality'] else ""
        budget_str = f" under **₹{int(entities['max_budget'])}**" if entities['max_budget'] else ""

        reply_lines = [
            f"Here are my top Nagpur recommendations{locality_str}{budget_str}:",
            f"\n1. **{top_item.dish_name}** at *{top_item.restaurant_name}* ({top_item.locality}) — **₹{int(top_item.price)}** | {top_item.match_score}% Match",
            f"   *{top_item.why_recommended}*",
        ]

        if len(items) > 1:
            reply_lines.append("\n**Other great options:**")
            for item in items[1:4]:
                reply_lines.append(f"- **{item.dish_name}** at *{item.restaurant_name}* ({item.locality}) — ₹{int(item.price)} (Rating: {item.rating}★)")

        reply_lines.append("\n*Feel free to like or dislike any option so I can personalize your next recommendations!*")
        return "\n".join(reply_lines), items, tools_executed

    def execute_groq_agent(self, message: str, history: Optional[List[Dict[str, str]]] = None) -> Tuple[str, List[RecommendationItem], List[ToolExecutionInfo]]:
        """Runs the Groq tool-calling agent with real tool executions and live Tavily integration."""
        tools_executed: List[ToolExecutionInfo] = []
        messages: List[Dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]

        if history:
            for h in history[-4:]:
                messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})

        messages.append({"role": "user", "content": message})

        # Step 1: Initial call with tools
        res1 = self.groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            tools=GROQ_TOOLS,
            tool_choice="auto"
        )
        msg1 = res1.choices[0].message
        recommended_items: List[RecommendationItem] = []

        if msg1.tool_calls:
            messages.append(msg1)

            for tc in msg1.tool_calls:
                t_name = tc.function.name
                try:
                    raw_args = json.loads(tc.function.arguments)
                    # Filter out None values
                    t_args = {k: v for k, v in raw_args.items() if v is not None}
                except Exception:
                    t_args = {}

                # Sweet vs Spicy safety check on arguments
                lowered_m = message.lower()
                is_sweet_req = any(k in lowered_m for k in [
                    "sweet", "sweets", "dessert", "desserts", "barfi", "mithai", "jalebi", "rabdi", 
                    "rabri", "ice cream", "kulfi", "sundae", "imarti", "jamun", "rasmalai", "rasgulla", "halwa", "ladoo", "laddu"
                ])

                if is_sweet_req:
                    if t_name in ["recommend_food", "filter_by_budget", "search_food_places"]:
                        t_args["cuisine"] = "Sweets & Desserts"
                        if "spice_level" in t_args or t_name == "recommend_food":
                            t_args["spice_level"] = 1

                result_str = ""
                if t_name == "recommend_food":
                    result_str = recommend_food.invoke(t_args)
                    try:
                        parsed = json.loads(result_str)
                        recommended_items = [RecommendationItem(**d) for d in parsed]
                    except Exception:
                        pass
                elif t_name == "search_food_places":
                    result_str = search_food_places.invoke(t_args)
                elif t_name == "filter_by_budget":
                    result_str = filter_by_budget.invoke(t_args)
                elif t_name == "get_food_details":
                    result_str = get_food_details.invoke(t_args)
                elif t_name == "save_user_feedback":
                    result_str = save_user_feedback.invoke(t_args)
                elif t_name == "search_web_tavily":
                    result_str = search_web_tavily.invoke(t_args)

                # Filter tool output so the LLM never sees spicy/savory records for sweet queries
                if is_sweet_req and t_name in ["recommend_food", "search_food_places", "filter_by_budget"]:
                    try:
                        raw_data = json.loads(result_str)
                        if isinstance(raw_data, list):
                            filtered_data = [
                                item for item in raw_data 
                                if item.get("cuisine") == "Sweets & Desserts" and int(item.get("spice_level", 1)) == 1
                            ]
                            if filtered_data:
                                result_str = json.dumps(filtered_data, indent=2)
                    except Exception:
                        pass

                tools_executed.append(ToolExecutionInfo(
                    tool=t_name,
                    args=t_args,
                    summary=f"Executed tool {t_name} with args {t_args}"
                ))

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result_str
                })

            # Step 2: Final response generation with tools
            res2 = self.groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                tools=GROQ_TOOLS
            )
            final_reply = res2.choices[0].message.content or ""

            if is_sweet_req and recommended_items:
                recommended_items = [
                    it for it in recommended_items 
                    if it.cuisine == "Sweets & Desserts" and it.spice_level == 1
                ]

            # Fail-safe: If the LLM returned empty content or hallucinated spicy items for sweet query
            spicy_leak = is_sweet_req and any(w in final_reply.lower() for w in [
                "tarri poha", "saoji", "spicy rassa", "mutton", "chicken", "biryani", "chana rassa", "misal"
            ])
            if (not final_reply.strip() or spicy_leak) and recommended_items:
                top = recommended_items[0]
                if is_sweet_req:
                    cat_header = "authentic sweets & desserts"
                elif any(w in message.lower() for w in ["spicy", "saoji", "fiery"]):
                    cat_header = f"spicy {top.cuisine}"
                elif any(w in message.lower() for w in ["breakfast", "poha"]):
                    cat_header = "morning breakfast & street food"
                else:
                    cat_header = f"{top.cuisine} food"

                lines = [
                    f"Here are my top Nagpur recommendations for {cat_header}:\n",
                    f"1. **{top.dish_name}** at *{top.restaurant_name}* ({top.locality}) — **₹{int(top.price)}** | {top.match_score}% Match",
                    f"   *{top.why_recommended}*\n"
                ]
                if len(recommended_items) > 1:
                    lines.append("**Other delicious options:**")
                    for it in recommended_items[1:5]:
                        lines.append(f"- **{it.dish_name}** at *{it.restaurant_name}* ({it.locality}) — ₹{int(it.price)} (Rating: {it.rating}★, Spice {it.spice_level}/5)")
                final_reply = "\n".join(lines)

            return final_reply, recommended_items, tools_executed
        else:
            return msg1.content or "", recommended_items, tools_executed

    def chat(self, message: str, history: Optional[List[Dict[str, str]]] = None) -> Tuple[str, List[RecommendationItem], List[ToolExecutionInfo], str]:
        """Dispatches to Groq agent, falling back to deterministic local mode on any error."""
        if self.groq_client is not None:
            try:
                reply, items, tools = self.execute_groq_agent(message, history)
                if reply.strip():
                    return reply, items, tools, "groq_agent"
            except Exception as e:
                logger.warning("Groq agent call failed (%s). Falling back to local mode.", e)

        reply, items, tools = self.execute_deterministic(message)
        return reply, items, tools, "deterministic_local"

agent_service = FoodAgentService()
