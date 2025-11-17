from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path
import models
from database import engine
from routers import blogs, users, authentication
import os

app = FastAPI(
    title="ASL Web Application",
    version="1.0.0"
)

# CORS Configuration - FIXED VERSION
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],  # This includes OPTIONS
    allow_headers=["*"],  # This includes Authorization, Content-Type, etc.
)

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Include routers with /api prefix
app.include_router(authentication.router)
app.include_router(blogs.router)
app.include_router(users.router)

# Serve React static files (for production)
static_dir = Path(__file__).parent.parent / "frontend" / "dist"
if static_dir.exists():
    # Mount assets
    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    
    # Serve index.html for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        file_path = static_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(static_dir / "index.html")

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}