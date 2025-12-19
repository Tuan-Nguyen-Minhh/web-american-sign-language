from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine
from .routers import users, authentication, detection, detection_history, admin
from .config import static_dir, assets_dir

app = FastAPI(
    title="ASL Web Application",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Include routers with /api prefix
app.include_router(authentication.router)
app.include_router(users.router)
app.include_router(detection.router)
app.include_router(detection_history.router)
app.include_router(admin.router)

# FOR PRODUCTION
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