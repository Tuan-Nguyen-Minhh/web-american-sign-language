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
if static_dir.exists():
    # Kiểm tra sự tồn tại của assets_dir nếu static_dir đã tồn tại (Tùy chọn)
    pass
# Nếu bạn cần kiểm tra sự tồn tại của assets_dir một cách riêng biệt, bạn có thể làm:
# if assets_dir.exists():
#     # Thực hiện hành động nếu nó tồn tại
#     pass