import sys
import os

# Resolve path to backend folder so Python imports 'app.*' without issues
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

# Export app instance for Vercel ASGI serverless handler
app = app
