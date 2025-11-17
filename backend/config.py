from pathlib import Path
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))