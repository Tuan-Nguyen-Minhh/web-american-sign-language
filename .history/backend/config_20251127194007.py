from pathlib import Path
import os
from dotenv import load_dotenv

# Load file .env trong cùng folder backend
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
DATABASE_URL = os.getenv("DATABASE_URL")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Serve React static files (for production)
static_dir = Path(__file__).parent.parent / "frontend" / "dist"

assets_dir = static_dir / "assets" #

if static_dir.exists():
    # Phần code bên trong if này có thể giữ nguyên hoặc loại bỏ tùy mục đích
    pass