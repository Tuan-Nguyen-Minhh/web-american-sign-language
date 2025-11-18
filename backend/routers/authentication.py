from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from .. import jwt_token, schemas,database, models
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/api/auth",
    tags=['Authentication']
)

@router.post('/login', response_model=schemas.TokenData)
def login(request: Annotated[OAuth2PasswordRequestForm, Depends()], db: Annotated[Session, Depends(database.get_db)]):
    # Try to find user by email or username
    user = db.query(models.User).filter(
        (models.User.email == request.username) | (models.User.name == request.username)
    ).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f'Invalid Credentials')
    if not jwt_token.verify_password(request.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f'Incorrect password')
    
    access_token = jwt_token.create_access_token(data={
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
def register(request: schemas.User, db: Annotated[Session, Depends(database.get_db)]):
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
        password=jwt_token.hash_password(request.password)
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

# Get current logged-in user information (USE FOR profile)
@router.get('/me', response_model=schemas.ShowUser)
def get_current_user_info(current_user: models.User = Depends(jwt_token.get_current_user)):
    return current_user