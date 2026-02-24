from backend.database import engine
from sqlalchemy import text

tables = [
    "user_settings",
    "users",
    "activities",
    "routes",
    "virtual_ride_sessions",
    "daily_metrics",
    "nutrition_entries"
]

def enable_rls():
    with engine.begin() as conn:
        for table in tables:
            print(f"Enabling Row Level Security for table: {table}")
            try:
                # Force row level security to enable it
                conn.execute(text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;"))
                # Note: Default behavior for Supabase when RLS is enabled without any policies
                # is to DENY all access to the table, which is exactly what we want to shut down
                # the auto-generated api. Our SQLAlchemy user operates as a superuser/owner and
                # continues to bypass RLS.
                print(f"✅ RLS enabled on {table}")
            except Exception as e:
                print(f"❌ Failed to enable RLS on {table}: {e}")
                
if __name__ == "__main__":
    print("Starting RLS security update...")
    enable_rls()
    print("Update complete.")
