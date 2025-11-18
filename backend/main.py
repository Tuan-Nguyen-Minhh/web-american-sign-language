from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from . import models
from .database import engine
from .routers import blogs, users, authentication
from .config import static_dir

app = FastAPI()

# Mount static files
app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

models.Base.metadata.create_all(engine)

app.include_router(authentication.router, prefix="/api")
app.include_router(blogs.router, prefix="/api")
app.include_router(users.router, prefix="/api")

# Catch-all route to serve React's index.html
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    # Don't serve React for API routes
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    # Serve React's index.html for all other routes (SPA routing)
    react_index = static_dir / "index.html"
    return FileResponse(str(react_index))