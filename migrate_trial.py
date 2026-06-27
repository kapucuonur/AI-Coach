import os
import sqlalchemy as sa
from dotenv import load_dotenv

# Load environment variables, prioritizing .env
load_dotenv()

def migrate_local():
    # SQLite logic
    import sqlite3
    try:
        conn = sqlite3.connect('sql_app.db')
        cursor = conn.cursor()
        print("Adding created_at column to local SQLite...")
        # SQLite doesn't allow CURRENT_TIMESTAMP for initial ADD COLUMN with NOT NULL
        cursor.execute("ALTER TABLE users ADD COLUMN created_at DATETIME;")
        cursor.execute("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;")
        conn.commit()
        conn.close()
        print("Local SQLite migration completed successfully!")
    except Exception as e:
        if "duplicate column name" in str(e).lower():
            print("Local SQLite already has created_at column.")
        else:
            print(f"Local SQLite migration failed: {e}")

def migrate_prod():
    database_url = os.getenv("RENDER_DATABASE_URL")

    if not database_url:
        print("Skipping prod database migration. RENDER_DATABASE_URL environment variable is not set.")
        return

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
            print("Adding created_at column to production DB...")
            conn.execute(sa.text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL;"))
            
            print("Production database schema migration for trial tracking completed successfully!")
    except Exception as e:
        if "duplicate column" in str(e).lower():
            print("Production DB already has created_at column.")
        else:
            print(f"Production migration failed: {e}")

if __name__ == '__main__':
    migrate_local()
    migrate_prod()
