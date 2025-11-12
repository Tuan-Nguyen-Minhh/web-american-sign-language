from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from .. import schemas,database, models, token
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..config import templates

router = APIRouter(
    tags=['Authentication']
)

@router.post('/login')
def login(request: Annotated[OAuth2PasswordRequestForm, Depends()], db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == request.username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'Invalid Credentials')
    if not token.verify_password(request.password, user.password):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'Incorrect password')
    
    access_token = token.create_access_token(data={"sub": user.email})
    return schemas.Token(access_token=access_token, token_type="bearer")


@router.get("/")
async def home_page(request: Request):
    return templates.TemplateResponse("home_page.html", {"request": request})

@router.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@router.get("/register")
async def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})