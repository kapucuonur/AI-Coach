import sys
import os

# Add the current directory (backend/) to sys.path so 'app' can be imported as a top-level module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
