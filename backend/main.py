from contextlib import asynccontextmanager
import os
import logging
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine, init_database
from .routers import users, authentication, detection, detection_history, admin
from .config import static_dir, assets_dir

logger = logging.getLogger("asl_app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database and seed admin on startup
    try:
        init_database()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Warning: Database initialization failed on startup: {e}")
    yield

app = FastAPI(
    title="ASL Web Application",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration (supports env var for deployment)
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip() and origin.strip() != "*"]

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://web-american-sign-language.vercel.app"
]
for origin in default_origins:
    if origin not in allowed_origins:
        allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include routers with /api prefix
app.include_router(authentication.router)
app.include_router(users.router)
app.include_router(detection.router)
app.include_router(detection_history.router)
app.include_router(admin.router)

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# FOR PRODUCTION (Only if frontend/dist exists)
if (static_dir / "index.html").exists():
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Serve index.html for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        file_path = static_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(static_dir / "index.html")
else:
    @app.get("/")
    async def root():
        return {
            "status": "online",
            "message": "ASL Backend API is running successfully on Render!",
            "docs": "/docs",
            "health": "/api/health"
        }