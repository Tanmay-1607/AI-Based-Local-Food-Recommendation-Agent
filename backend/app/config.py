import os
from pathlib import Path
from dotenv import load_dotenv

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=True)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b").strip()
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "").strip()

PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "127.0.0.1")

DATA_PATH = Path(os.getenv("DATA_PATH", str(BASE_DIR / "data" / "food_places.csv")))
DB_PATH = Path(os.getenv("DB_PATH", str(BASE_DIR / "app" / "localbite.db")))

def is_groq_configured() -> bool:
    """Check if a valid Groq API key is configured."""
    return bool(GROQ_API_KEY and len(GROQ_API_KEY) > 10 and not GROQ_API_KEY.startswith("gsk_placeholder"))

def is_tavily_configured() -> bool:
    """Check if a valid Tavily API key is configured."""
    return bool(TAVILY_API_KEY and len(TAVILY_API_KEY) > 10)
