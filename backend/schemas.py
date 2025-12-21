from typing import List
from pydantic import BaseModel, EmailStr

class User(BaseModel):
    name: str
    email: str
    password: str

class ShowUser(BaseModel):
    id: int
    name: str
    email: str
    role: str  # 'admin' or 'user'
    total_detection_sessions: int = 0
    
    class Config():
        from_attributes = True

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

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
    role: str  # 'admin' or 'user'

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserInfo

class TokenData(BaseModel):
    email: str | None = None
    user_id: int | None = None
    name: str | None = None
    role: str | None = None

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

class ASLPredictionResponse(BaseModel):
    prediction: str
    confidence: float
    total_hands: int
    detections: List[HandDetection] = []

class DetectionItem(BaseModel):
    word: str
    confidence: float

class SaveDetectionHistoryRequest(BaseModel):
    session_name: str | None = None
    detections: List[DetectionItem]

class DetectionHistoryResponse(BaseModel):
    id: int
    session_name: str | None
    total_detections: int
    created_at: str
    detections: List[DetectionItem]

    class Config:
        from_attributes = True