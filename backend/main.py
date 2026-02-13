from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, dashboard, coach, settings, chat, plan
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Coach API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(coach.router, prefix="/api/coach", tags=["Coach"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(plan.router, prefix="/api/plan", tags=["Plan"])
from backend.routers import charts
app.include_router(charts.router, prefix="/api/charts", tags=["Charts"])

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    import logging
    logger = logging.getLogger("uvicorn")
    logger.error(f"Validation Error: {exc.errors()}")
    logger.error(f"Body: {await request.body()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(exc.body)},
        content={"detail": exc.errors(), "body": str(exc.body)},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    error_trace = traceback.format_exc()
    import logging
    logger = logging.getLogger("uvicorn")
    logger.error(f"Global Exception: {error_trace}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc), "traceback": error_trace}
    )

@app.on_event("startup")
async def startup_event():
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info(">>> STARTING AI COACH API - VERSION: ADVANCED_METRICS_V1 <<<")
    
    # Ensure tables are created
    from backend.database import engine, Base
    from backend import models # Make sure models are imported
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified.")

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Coach API"}
