
import sys
import os

# Render expects this file to exist if the Start Command is set to "uvicorn backend.main:app"
# We add the current directory to sys.path so we can import 'app' module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
