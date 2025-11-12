from pathlib import Path
from fastapi.templating import Jinja2Templates
import os
from dotenv import load_dotenv



# Load file .env trong cùng folder backend
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
DATABASE_URL = os.getenv("DATABASE_URL")



# Get the base directory (project root)
base_dir = Path(__file__).resolve().parent.parent

# Static files and templates directories
static_dir = base_dir / "frontend" / "static"
templates_dir = base_dir / "frontend" / "templates"

# Khai báo templates
templates = Jinja2Templates(directory=str(templates_dir))