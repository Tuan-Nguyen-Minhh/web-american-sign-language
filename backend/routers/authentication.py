from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from jwt_token import hash_password, verify_password, get_current_user, create_access_token
import schemas
from database import get_db
import models
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/api/auth",
    tags=['Authentication']
)

@router.post('/login', response_model=schemas.Token)
def login(request: schemas.Login, db: Session = Depends(get_db)):
    """
    Login endpoint - accepts JSON with username/email and password
    """
    # Try to find user by email or username
    user = db.query(models.User).filter(
        (models.User.email == request.username) | (models.User.name == request.username)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail='Invalid credentials'
        )
    
    if not verify_password(request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail='Invalid credentials'
        )
    
    # Create access token with user info
    access_token = create_access_token(data={
        "sub": user.email,
        "user_id": user.id,
        "name": user.name
    })
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }

@router.post('/register', status_code=status.HTTP_201_CREATED, response_model=schemas.ShowUser)
def register(request: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register new user - accepts JSON with name, email, and password
    """
    # Check if user already exists
    existing_user = db.query(models.User).filter(
        (models.User.email == request.email) | (models.User.name == request.username)
    ).first()
    
    if existing_user:
        if existing_user.email == request.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Email already registered'
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Username already taken'
            )
    
    # Create new user
    new_user = models.User(
        name=request.username,
        email=request.email,
        password=hash_password(request.password)
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.get('/me', response_model=schemas.ShowUser)
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    """
    Get current logged-in user information
    """
    return current_user