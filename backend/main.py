from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from . import models
from .database import engine
from .routers import blogs, users, authentication
from .config import static_dir

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

models.Base.metadata.create_all(engine)

app.include_router(authentication.router)
app.include_router(blogs.router)
app.include_router(users.router)