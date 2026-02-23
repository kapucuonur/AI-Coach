import os
import sqlalchemy as sa
from dotenv import load_dotenv

# Load environment variables, prioritizing .env
load_dotenv()

# We expect VITE_PROD_DB_URL or DATABASE_URL to be set to the Render database.
database_url = os.getenv("RENDER_DATABASE_URL")

if not database_url:
    print("Error: RENDER_DATABASE_URL environment variable is not set. Please provide it, e.g., 'export RENDER_DATABASE_URL=postgresql://...'")
    exit(1)

# Ensure pg8000 is used since the backend utilizes it
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+pg8000://", 1)

try:
    print(f"Connecting to {database_url.split('@')[-1]}...")
    engine = sa.create_engine(database_url, connect_args={"ssl_context": __import__("ssl").create_default_context()})
    
    with engine.begin() as conn:
        print("Adding google_id column...")
        conn.execute(sa.text("ALTER TABLE users ADD COLUMN google_id VARCHAR;"))
        
        print("Adding facebook_id column...")
        conn.execute(sa.text("ALTER TABLE users ADD COLUMN facebook_id VARCHAR;"))
        
        print("Making hashed_password nullable...")
        conn.execute(sa.text("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;"))
        
        # Add indices
        print("Adding indices...")
        conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id ON users (google_id);"))
        conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_facebook_id ON users (facebook_id);"))
        
        print("Production database schema migration completed successfully!")
except Exception as e:
    print(f"Migration failed: {e}")
