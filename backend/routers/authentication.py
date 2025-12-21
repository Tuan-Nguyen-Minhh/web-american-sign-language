from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from .. import schemas, database, models, jwt_token as token
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/api/auth",
    tags=['Authentication']
)

# Login endpoint - accepts form data (OAuth2)
@router.post('/login', response_model=schemas.LoginResponse)
def login(
    request: Annotated[OAuth2PasswordRequestForm, Depends()], 
    db: Session = Depends(database.get_db)
):
    print(f"Login attempt for: {request.username}") 
    
    # Try to find user by email or username
    user = db.query(models.User).filter(
        (models.User.email == request.username) | (models.User.name == request.username)
    ).first()
    
    if not user:
        print(f"User not found: {request.username}") 
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail='Invalid credentials'
        )
    
    if not token.verify_password(request.password, user.password):
        print(f"Invalid password for: {request.username}") 
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail='Invalid credentials'
        )
    
    print(f"Login successful for: {user.name}") 
    
    access_token = token.create_access_token(data={
        "sub": user.email,
        "user_id": user.id,
        "name": user.name,
        "role": user.role.value  # Include role in JWT token
    })
    
    refresh_token = token.create_refresh_token(data={
        "sub": user.email,
        "user_id": user.id
    })
    
    # Store refresh token in database
    user.refresh_token = refresh_token
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value
        }
    }

# Register endpoint - register new user
@router.post('/register', status_code=status.HTTP_201_CREATED, response_model=schemas.ShowUser)
def register(request: schemas.UserCreate, db: Session = Depends(database.get_db)):
    print(f"Registration attempt: username={request.username}, email={request.email}")
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(
        (models.User.email == request.email) | (models.User.name == request.username)
    ).first()
    
    if existing_user:
        if existing_user.email == request.email:
            print(f"Email already exists: {request.email}")  
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Email already registered'
            )
        else:
            print(f"Username already exists: {request.username}") 
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Username already taken'
            )
    
    # Create new user
    new_user = models.User(
        name=request.username, 
        email=request.email,
        password=token.hash_password(request.password)
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    print(f"User created successfully: {new_user.name} (ID: {new_user.id})")  
    
    return new_user

# Get current logged-in user information
@router.get('/me', response_model=schemas.ShowUser)
def get_current_user_info(current_user: models.User = Depends(token.get_current_user)):
    return current_user

# Refresh access token using refresh token
@router.post('/refresh', response_model=schemas.TokenWithRefresh)
def refresh_access_token(
    request: schemas.RefreshTokenRequest,
    db: Session = Depends(database.get_db)
):
    # Verify refresh token
    user = token.verify_refresh_token(request.refresh_token, db)
    
    # Generate new access token
    new_access_token = token.create_access_token(data={
        "sub": user.email,
        "user_id": user.id,
        "name": user.name,
        "role": user.role.value
    })
    
    # Optionally rotate refresh token (more secure)
    new_refresh_token = token.create_refresh_token(data={
        "sub": user.email,
        "user_id": user.id
    })
    
    # Update refresh token in database
    user.refresh_token = new_refresh_token
    db.commit()
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

# Guest login endpoint - no credentials required
@router.post('/guest', response_model=schemas.LoginResponse)
def guest_login():
    # Create a temporary guest token (no database entry)
    access_token = token.create_access_token(data={
        "sub": "guest",
        "user_id": 0,
        "name": "Guest",
        "role": models.UserRole.GUEST.value
    })
    
    # Guest doesn't need a refresh token (session-based only)
    return {
        "access_token": access_token,
        "refresh_token": None,
        "token_type": "bearer",
        "user": {
            "id": 0,
            "name": "Guest",
            "email": "guest",
            "role": models.UserRole.GUEST.value
        }
    }