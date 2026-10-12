import os
import sys

# Ensure backend directory is in sys.path for serverless execution
cur_dir = os.path.dirname(os.path.abspath(__file__))
if cur_dir not in sys.path:
    sys.path.insert(0, cur_dir)

from app.main import app

# Top-level ASGI export for Vercel Serverless
app = app
