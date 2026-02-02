from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, dashboard, coach, settings
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Coach API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(coach.router, prefix="/api/coach", tags=["Coach"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Coach API"}
