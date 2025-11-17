from typing import List, Optional
from pydantic import BaseModel, EmailStr

class BlogBase(BaseModel):
    title: str
    body: str

class Blog(BlogBase):
    class Config():
        from_attributes = True

class User(BaseModel):
    name: str
    email: str
    password: str

class UserCreate(BaseModel):
    """Schema for user registration"""
    username: str
    email: EmailStr
    password: str

class ShowUser(BaseModel):
    id: int
    name: str
    email: str
    blogs: List[Blog] = []

    class Config():
        from_attributes = True

class ShowBlog(BaseModel):
    title: str
    body: str
    creator: ShowUser

    class Config():
        from_attributes = True

class Login(BaseModel):
    """Schema for login"""
    username: str  # Can be email or username
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[dict] = None  # Include user info in token response

class TokenData(BaseModel):
    email: str | None = None
    user_id: int | None = None
    name: str | None = None