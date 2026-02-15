
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from backend.app.main import app
    print("✅ App imported successfully!")
except Exception as e:
    print(f"❌ App import failed: {e}")
    import traceback
    traceback.print_exc()
