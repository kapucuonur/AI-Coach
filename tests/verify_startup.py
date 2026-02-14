
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from app.main import app
    print("✅ Application imported successfully!")
except Exception as e:
    print(f"❌ Application failed to import: {e}")
    import traceback
    traceback.print_exc()
