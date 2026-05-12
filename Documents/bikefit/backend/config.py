import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", 8001))
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
CORS_ALLOW_ORIGINS = os.getenv("CORS_ALLOW_ORIGINS", "*").split(",")
