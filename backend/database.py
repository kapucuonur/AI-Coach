from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging
import ssl

logger = logging.getLogger("uvicorn")

# Database URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

# Fix Render's postgres:// URL format (must be postgresql://)
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)
    logger.info("Converted postgres:// to postgresql://")

# Create engine with appropriate configuration
connect_args = {}
engine_kwargs = {}

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # SQLite configuration (development only)
    connect_args = {"check_same_thread": False}
    # SQLite doesn't support pool_size/max_overflow in typical expected way or needs specific handling
    logger.info("Using SQLite database")

else:
    # PostgreSQL configuration (Production/Supabase)
    
    # Connection pooling settings for Render/serverless environments
    engine_kwargs = {
        "pool_size": 5,           # Maintain 5 connections
        "max_overflow": 10,       # Allow up to 10 extra connections
        "pool_timeout": 30,       # Wait 30 seconds for available connection
        "pool_recycle": 1800,     # Recycle connections after 30 minutes
        "pool_pre_ping": True,    # Test connections before using (CRITICAL!)
    }

    # Handle SSL for Supabase/Render
    # If using psycopg2 (standard), it usually handles sslmode=require from the URL.
    # If using pg8000, we need explicit SSL context.
    
    # Try to determine driver
    if "pg8000" in SQLALCHEMY_DATABASE_URL or os.getenv("USE_PG8000", "False").lower() == "true":
        # Force pg8000 or URL implies it
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE # Relaxed for some cloud providers if needed, or CERT_OPTIONAL
        connect_args = {"ssl_context": ssl_context}
        logger.info("Configured SSL for pg8000")
        
        # Ensure URL has the driver
        if not "postgresql+pg8000" in SQLALCHEMY_DATABASE_URL:
             SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

# Create engine
try:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args=connect_args,
        **engine_kwargs
    )
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    raise

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        raise
    finally:
        db.close()
