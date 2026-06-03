import sys
import os
import urllib.parse
from sqlalchemy import text

# Add the parent directory to sys.path so we can import backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine

def upgrade():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN premium_valid_until TIMESTAMP;"))
            print("Successfully added premium_valid_until to users table.")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("Column premium_valid_until already exists.")
            else:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    upgrade()
