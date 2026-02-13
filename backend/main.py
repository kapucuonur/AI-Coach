from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import logging
import traceback
import os

# Load env vars before any other imports
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

app = FastAPI(title="AI Coach API", version="1.0.0")

# Configure CORS - Fixed for credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",   # Alternative dev port
        "https://ai-coach-usoh.onrender.com", # Production URL
        "*"  # Fallback
    ],
    allow_credentials=True, 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from backend.routers import auth, dashboard, coach, settings, chat, plan, charts

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(coach.router, prefix="/api/coach", tags=["Coach"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(plan.router, prefix="/api/plan", tags=["Plan"])
app.include_router(charts.router, prefix="/api/charts", tags=["Charts"])

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with proper logging"""
    body = await request.body()
    logger.error(f"Validation Error: {exc.errors()}")
    logger.error(f"Body: {body.decode() if body else 'empty'}")
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "body": body.decode() if body else None
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    error_trace = traceback.format_exc()
    logger.error(f"Global Exception: {error_trace}")
    
    # In production, we might want to hide detailed tracebacks, 
    # but for debugging this current 500 issue, we keep them visible.
    is_production = os.getenv("ENVIRONMENT") == "production"
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error": str(exc),
            "traceback": error_trace # Keep traceback even in prod for now until stable
        }
    )

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "service": "ai-coach-api"}

@app.on_event("startup")
async def startup_event():
    """Initialize database and verify connections"""
    logger.info(">>> STARTING AI COACH API - VERSION: PRODUCTION_FIX_V1 <<<")
    
    try:
        # Test database connection
        from backend.database import engine, Base
        from backend import models
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified/created.")
        
        # Test actual connection
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info(f"Database connection test: {result.scalar()}")
            
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        logger.error(traceback.format_exc())
        # We don't raise here to allow the app to start and return 500s with logs 
        # instead of hard crashing the container loops.

@app.get("/")
def read_root():
    return {
        "message": "Welcome to AI Coach API",
        "status": "running",
        "version": "1.0.0"
    }
