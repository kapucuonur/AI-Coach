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
if "?sslmode=require" in database_url:
    database_url = database_url.replace("?sslmode=require", "")
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+pg8000://", 1)

try:
    print(f"Connecting to {database_url.split('@')[-1]}...")
    import ssl
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    engine = sa.create_engine(database_url, connect_args={"ssl_context": ctx})
    
    with engine.begin() as conn:
        print("Adding is_premium column...")
        conn.execute(sa.text("ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;"))
        
        print("Adding stripe_customer_id column...")
        conn.execute(sa.text("ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR;"))
        
        print("Adding stripe_subscription_id column...")
        conn.execute(sa.text("ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR;"))
        
        print("Adding subscription_status column...")
        conn.execute(sa.text("ALTER TABLE users ADD COLUMN subscription_status VARCHAR DEFAULT 'inactive';"))
        
        # Add indices
        print("Adding indices...")
        conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_stripe_customer_id ON users (stripe_customer_id);"))
        conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_stripe_subscription_id ON users (stripe_subscription_id);"))
        
        print("Production database schema migration for Stripe completed successfully!")
except Exception as e:
    print(f"Migration failed: {e}")
