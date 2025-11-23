from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from .. import schemas, database, models, jwt_token as token
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/api/auth",
    tags=['Authentication']
)

@router.post('/login', response_model=schemas.LoginResponse)
def login(
    request: Annotated[OAuth2PasswordRequestForm, Depends()], 
    db: Session = Depends(database.get_db)
):
    """Login endpoint - accepts form data (OAuth2)"""
    print(f"Login attempt for: {request.username}")  # Debug
    
    # Try to find user by email or username
    user = db.query(models.User).filter(
        (models.User.email == request.username) | (models.User.name == request.username)
    ).first()
    
    if not user:
        print(f"User not found: {request.username}")  # Debug
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail='Invalid credentials'
        )
    
    if not token.verify_password(request.password, user.password):
        print(f"Invalid password for: {request.username}")  # Debug
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail='Invalid credentials'
        )
    
    print(f"Login successful for: {user.name}")  # Debug
    
    access_token = token.create_access_token(data={
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
def register(request: schemas.UserCreate, db: Session = Depends(database.get_db)):
    """
    Register new user
    Accepts: { "username": "...", "email": "...", "password": "..." }
    """
    print(f"Registration attempt: username={request.username}, email={request.email}")  # Debug
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(
        (models.User.email == request.email) | (models.User.name == request.username)
    ).first()
    
    if existing_user:
        if existing_user.email == request.email:
            print(f"Email already exists: {request.email}")  # Debug
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Email already registered'
            )
        else:
            print(f"Username already exists: {request.username}")  # Debug
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Username already taken'
            )
    
    # Create new user
    # IMPORTANT: Map "username" from frontend to "name" in database
    new_user = models.User(
        name=request.username,  # Frontend sends "username", DB expects "name"
        email=request.email,
        password=token.hash_password(request.password)
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    print(f"User created successfully: {new_user.name} (ID: {new_user.id})")  # Debug
    
    return new_user


@router.get('/me', response_model=schemas.ShowUser)
def get_current_user_info(current_user: models.User = Depends(token.get_current_user)):
    """Get current logged-in user information"""
    return current_user