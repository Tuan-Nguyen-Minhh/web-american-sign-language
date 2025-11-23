from typing import List
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



class ShowUser(BaseModel):
    id: int
    name: str
    email: str
    blogs: List[Blog] = []

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    class Config():
        from_attributes = True

class ShowBlog(BaseModel):
    title: str
    body: str
    creator: ShowUser

    class Config():
        from_attributes = True

class Login(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserInfo(BaseModel):
    id: int
    name: str
    email: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserInfo

class TokenData(BaseModel):
    email: str | None = None
    user_id: int | None = None
    name: str | None = None

class HandDetection(BaseModel):
    bbox: List[int]  # [x1, y1, x2, y2]
    confidence: float
    class_name: str = "hand"

class DetectionResponse(BaseModel):
    success: bool
    detections: List[HandDetection]
    total_hands: int
    error: str | None = None

class DetectionRequest(BaseModel):
    image: str  # base64 encoded image