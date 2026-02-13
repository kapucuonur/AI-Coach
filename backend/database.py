from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
import logging
import urllib.parse
import ssl

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

# Get DATABASE_URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

# Fix common URL format issues
original_url = SQLALCHEMY_DATABASE_URL

# 1. Fix postgres:// -> postgresql://
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 2. Handle Supabase-specific formats
is_supabase_pooler = "pooler.supabase.com" in SQLALCHEMY_DATABASE_URL
is_supabase_direct = "supabase.co" in SQLALCHEMY_DATABASE_URL

if is_supabase_pooler:
    logger.info("Detected Supabase Connection Pooler (port 6543) - Adjusting for Transaction Mode")
    # Usually SSL mode is handled in connect_args, strip query param to avoid double-handling or parsing issues
    if "?sslmode=" in SQLALCHEMY_DATABASE_URL:
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.split("?")[0]
elif is_supabase_direct:
    logger.info("Detected Supabase Direct Connection")

# 3. Decode URL-encoded characters in password (CRITICAL FIX)
try:
    if "sqlite" not in SQLALCHEMY_DATABASE_URL:
        # Use a dummy scheme for urlparse just in case requests lib isn't perfectly compliant with postgresql://
        # but standard urllib works fine.
        parsed = urllib.parse.urlparse(SQLALCHEMY_DATABASE_URL)
        if parsed.password:
            # Check if password seems encoded (e.g. %23)
            if "%" in parsed.password:
                decoded_password = urllib.parse.unquote(parsed.password)
                if decoded_password != parsed.password:
                    logger.info("Decoded URL-encoded password in connection string.")
                    # Rebuild URL
                    # Netloc structure: username:password@hostname:port
                    # We must re-encode properly or just construct carefully. 
                    # Actually, SQLAlchemy expects the password to NOT be double encoded if passed in URL usually, 
                    # but if using creating engine, special chars can be tricky.
                    # Best practice: Decode here, then re-encode ONLY special chars if constructing a string, 
                    # or better: rely on the driver.
                    # BUT: The issue is often that the %23 is LITERAL if not decoded.
                    
                    # Safer approach: Reconstruct netloc with the decoded password ONLY IF it was heavily encoded?
                    # Actually, SQLAlchemy's `make_url` usually handles this.
                    # Let's trust the user's provided logic which was very specific about unquote/quote.
                    
                    safe_password = urllib.parse.quote(decoded_password, safe='')
                    
                    # Reconstruct
                    netloc = f"{parsed.username}:{safe_password}@{parsed.hostname}"
                    if parsed.port:
                        netloc += f":{parsed.port}"
                    
                    SQLALCHEMY_DATABASE_URL = urllib.parse.urlunparse(
                        (parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment)
                    )
except Exception as e:
    logger.warning(f"URL parsing warning: {e}")

# Connection configuration
connect_args = {}
engine_kwargs = {}

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine_kwargs = {"pool_size": 1, "max_overflow": 0}

elif SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
    
    # Determine driver
    driver = "psycopg2"
    try:
        import psycopg2
        logger.info("Using psycopg2 driver")
    except ImportError:
        try:
            import pg8000
            driver = "pg8000"
            SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
                "postgresql://", "postgresql+pg8000://", 1
            )
            logger.info("Using pg8000 driver")
        except ImportError:
            logger.error("No PostgreSQL driver found!")
            driver = "unknown"
    
    # Supabase-specific settings
    if is_supabase_pooler:
        # Port 6543 (PgBouncer) requires prepared statements disabled
        if driver == "psycopg2":
            connect_args = {
                "sslmode": "require",
                "options": "-c statement_cache_size=0"  # CRITICAL: Disable prepared statements for Transaction Mode
            }
        else:  # pg8000
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_REQUIRED
            connect_args = {
                "ssl_context": ssl_context
                # pg8000 might not need explicit statement cache disabling or handles it differently
            }
        
        # Use NullPool for PgBouncer to avoid connection issues (Let Supabase manage the pool)
        engine_kwargs = {
            "poolclass": NullPool,
            "echo": False
        }
        
    elif is_supabase_direct:
        # Port 5432 direct connection
        if driver == "psycopg2":
            connect_args = {"sslmode": "require"}
        else:
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_REQUIRED
            connect_args = {"ssl_context": ssl_context}
        
        # Standard pooling for direct connection
        engine_kwargs = {
            "pool_size": 5,
            "max_overflow": 10,
            "pool_timeout": 30,
            "pool_recycle": 1800,
            "pool_pre_ping": True,
            "echo": False
        }
    else:
        # Generic PostgreSQL (Render Native, etc.)
        engine_kwargs = {
            "pool_size": 5,
            "max_overflow": 10,
            "pool_timeout": 30,
            "pool_recycle": 1800,
            "pool_pre_ping": True
        }

# Create engine
try:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args=connect_args,
        **engine_kwargs
    )
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    # Don't raise immediately to avoid import-time crash, let get_db fail
    engine = None

# Session and Base
if engine:
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    # Dummy session maker that fails
    def SessionLocal():
        raise Exception("Database engine failed to initialize")

Base = declarative_base()

def get_db():
    if not engine:
        raise Exception("Database not initialized")
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"DB session error: {e}")
        raise
    finally:
        db.close()

def test_connection():
    """Test connectivity"""
    if not engine: return False
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(text("SELECT 1"))
            return result.scalar() == 1
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        return False
