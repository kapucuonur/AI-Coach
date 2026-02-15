from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import ssl
import urllib.parse

# Database URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

# Check for psycopg2 (preferred for production/Render)
try:
    import psycopg2
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

# Use pg8000 driver for PostgreSQL ONLY if psycopg2 is missing
if SQLALCHEMY_DATABASE_URL.startswith("postgresql://") and not HAS_PSYCOPG2:
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)
    
    # Remove sslmode from query params because pg8000 doesn't support it (uses ssl_context)
    if "?" in SQLALCHEMY_DATABASE_URL:
        try:
            url_parts = urllib.parse.urlparse(SQLALCHEMY_DATABASE_URL)
            query = urllib.parse.parse_qs(url_parts.query)
            if 'sslmode' in query:
                del query['sslmode']
            
            new_query = urllib.parse.urlencode(query, doseq=True)
            SQLALCHEMY_DATABASE_URL = urllib.parse.urlunparse(url_parts._replace(query=new_query))
        except Exception as e:
            print(f"Warning: Failed to parse/clean DB URL for pg8000: {e}")

# Create engine
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif "postgresql+pg8000" in SQLALCHEMY_DATABASE_URL:
    # Supabase/PostgreSQL requires SSL when using pg8000
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args = {"ssl_context": ssl_context}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
