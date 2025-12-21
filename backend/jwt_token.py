from typing import Annotated
from datetime import datetime, timedelta, timezone
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from jwt.exceptions import InvalidTokenError
from . import schemas, database, models
from sqlalchemy.orm import Session
from pwdlib import PasswordHash
import jwt
from .config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
password_hash = PasswordHash.recommended()

def hash_password(password: str):
    return password_hash.hash(password)
    
def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_refresh_token(token: str, db: Session):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if email is None or token_type != "refresh":
            raise credentials_exception
        
        # Verify token exists in database
        user = db.query(models.User).filter(models.User.email == email).first()
        if user is None or user.refresh_token != token:
            raise credentials_exception
            
        return user
        
    except InvalidTokenError:
        raise credentials_exception

def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Annotated[Session, Depends(database.get_db)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        name: str = payload.get("name")
        role: str = payload.get("role")

        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email, user_id=user_id, name=name, role=role)

    except InvalidTokenError:
        raise credentials_exception
    
    # Handle guest users (they don't exist in the database)
    if role == models.UserRole.GUEST.value:
        # Create a temporary guest user object (not persisted in DB)
        guest_user = models.User(
            id=0,
            name="Guest",
            email="guest",
            password="",
            role=models.UserRole.GUEST,
            total_detection_sessions=0
        )
        return guest_user
    
    user = db.query(models.User).filter(models.User.email == token_data.email).first()

    if user is None:
        raise credentials_exception
    
    return user

# Dependency to get current admin user
def get_current_admin_user(current_user: Annotated[models.User, Depends(get_current_user)]):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin access required."
        )
    return current_user

# Flexible role checker
def require_role(allowed_roles: list):
    def role_checker(current_user: Annotated[models.User, Depends(get_current_user)]):
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not enough permissions. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

# Dependency to ensure user is not a guest (for restricted features)
def get_authenticated_user(current_user: Annotated[models.User, Depends(get_current_user)]):
    if current_user.role == models.UserRole.GUEST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature requires authentication. Please login or register."
        )
    return current_user