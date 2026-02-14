
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import engine, Base
from app.config import ALLOWED_ORIGINS
from app.routers import auth, users, routes, trainer, virtual_ride, activities, coach
from app.migration import migrate_db

Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 AI-Coach starting...")
    migrate_db()  # Run schema updates
    yield
    print("👋 AI-Coach shutting down...")

app = FastAPI(
    title="AI-Coach API",
    description="AI-Powered Cycling Coach with Virtual Ride",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth")
app.include_router(users.router, prefix="/users")
app.include_router(routes.router, prefix="/routes")
app.include_router(trainer.router, prefix="/trainer")
app.include_router(virtual_ride.router, prefix="/virtual-ride")
app.include_router(activities.router, prefix="/activities")
app.include_router(coach.router, prefix="/coach")

@app.get("/")
def root():
    return {"message": "AI-Coach API", "status": "running", "docs": "/docs"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
