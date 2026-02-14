
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# PostgreSQL bağlantı (Render.com veya local)
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/aicoach"
)

# Güvenlik
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# WebSocket ayarları (Render timeout önlemek için)
WS_PING_INTERVAL = 20
WS_TIMEOUT = 25

# CORS için Vercel domain
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://ai-coach-nine-rho.vercel.app",
    "https://ai-coach.vercel.app",
    "https://ai-coach-usoh.onrender.com"
]
