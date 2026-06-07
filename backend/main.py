"""
Wrapper for main.py to allow Uvicorn to run from inside the backend directory.
This adds the repository root to the Python path so that 'backend' is recognized
as a top-level package, fixing relative import errors on Render.
"""
import sys
import os

# Add the parent directory (repository root) to sys.path
# This ensures that imports starting with 'backend.' or relative imports 
# within the 'backend' package resolve correctly, regardless of where uvicorn is started.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the actual application from the backend package
from backend.app_main import app
