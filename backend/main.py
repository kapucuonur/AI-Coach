import os
from dotenv import load_dotenv

# Load .env from backend directory BEFORE importing routers
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, dashboard, coach, settings, chat, plan, nutrition, garmin, payments, tts, voice, telegram

# AI Coach Backend - Unified SDK and Import Fix
from contextlib import asynccontextmanager
from backend.services.coach_brain import CoachBrain

@asynccontextmanager
async def lifespan(app: FastAPI):
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info(">>> STARTING AI COACH API - VERSION: SECURE_AUTH <<<")
    
    # Run DB migrations safely (idempotent)
    try:
        from backend.database import engine, SessionLocal
        from sqlalchemy import text, inspect
        with engine.connect() as conn:
            inspector = inspect(engine)
            columns = [c['name'] for c in inspector.get_columns('user_settings')]
            if 'user_id' not in columns:
                logger.info("Running migration: adding user_id to user_settings...")
                conn.execute(text("ALTER TABLE user_settings ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))
                conn.commit()
                logger.info("✅ Migration complete: user_id added to user_settings")
            else:
                logger.info("✅ Migration not needed: user_id already exists in user_settings")
            
            # Drop the unique index on key if it still exists (PostgreSQL)
            try:
                conn.execute(text("DROP INDEX IF EXISTS ix_user_settings_key"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_user_settings_key ON user_settings (key)"))
                conn.commit()
                logger.info("✅ Replaced global unique index with non-unique index on user_settings.key")
            except Exception:
                pass  # SQLite or index may not exist
                
            # Restore and map legacy settings (fix for migration bug)
            try:
                logger.info("Migrating legacy user_settings by mapping email to user_id...")
                all_users = conn.execute(text("SELECT id, email FROM users")).fetchall()
                for uid, email in all_users:
                    key = f"{email.lower()}_config"
                    null_row = conn.execute(text("SELECT key FROM user_settings WHERE key = :k AND user_id IS NULL"), {"k": key}).fetchone()
                    if null_row:
                        # They have an old row. Delete any new empty row that might have been accidentally created.
                        conn.execute(text("DELETE FROM user_settings WHERE key = :k AND user_id = :uid"), {"k": key, "uid": uid})
                        # Update the old row to have the correct user_id
                        conn.execute(text("UPDATE user_settings SET user_id = :uid WHERE key = :k AND user_id IS NULL"), {"k": key, "uid": uid})
                conn.commit()
            except Exception as e:
                logger.error(f"Failed to migrate legacy settings: {e}")
                
            # Add telegram columns if missing
            users_columns = [c['name'] for c in inspector.get_columns('users')]
            if 'telegram_chat_id' not in users_columns:
                logger.info("Running migration: adding telegram columns to users...")
                conn.execute(text("ALTER TABLE users ADD COLUMN telegram_chat_id VARCHAR"))
                conn.execute(text("ALTER TABLE users ADD COLUMN telegram_link_code VARCHAR"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_telegram_chat_id ON users (telegram_chat_id)"))
                conn.commit()
                logger.info("✅ Migration complete: telegram columns added")
    except Exception as migration_err:
        logger.error(f"Migration warning (non-fatal): {migration_err}")
    
    # Initialize global CoachBrain singleton
    app.state.brain = CoachBrain()
    yield
    logger.info(">>> SHUTTING DOWN AI COACH API <<<")


app = FastAPI(title="AI Coach API", version="1.0.0", lifespan=lifespan)

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,https://ai-coach-nine-rho.vercel.app,https://coachonurai.com,https://www.coachonurai.com")
origins_list = [origin.strip() for origin in ALLOWED_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
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
from backend.routers import garmin_app
app.include_router(garmin_app.router, prefix="/api/garmin-app", tags=["Garmin App"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(tts.router, prefix="/api/tts", tags=["TTS"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice"])
app.include_router(telegram.router, prefix="/api/telegram", tags=["Telegram"])

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



@app.get("/")
@app.head("/")
def read_root():
    return {"message": "Welcome to AI Coach API"}
