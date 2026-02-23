from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, dashboard, coach, settings, chat, plan, nutrition, garmin
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Coach API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "https://ai-coach-nine-rho.vercel.app",
        "https://ai-coach-bgatm3iql-kapucuonurs-projects.vercel.app",
        "https://ai-coach-kpb6cyg1q-kapucuonurs-projects.vercel.app",
        "https://ai-coach-86p5pwe1w-kapucuonurs-projects.vercel.app",
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
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(plan.router, prefix="/api/plan", tags=["Plan"])
app.include_router(nutrition.router, prefix="/api", tags=["Nutrition"])
app.include_router(garmin.router, prefix="/api/garmin", tags=["Garmin"])
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
    )

@app.on_event("startup")
async def startup_event():
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info(">>> STARTING AI COACH API - VERSION: THREADED_MFA_FIX_CONFIRMED <<<")

@app.get("/")
@app.head("/")
def read_root():
    return {"message": "Welcome to AI Coach API"}
