from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String)
    password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.USER)  # Role: admin or user
    total_detection_sessions = Column(Integer, default=0)  # Count all sessions (saved or not)
    refresh_token = Column(String, nullable=True)  # Store refresh token for auto-login

    detection_histories = relationship("DetectionHistory", back_populates="user")

class DetectionHistory(Base):
    __tablename__ = "detection_histories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    session_name = Column(String, nullable=True)  # Optional name for the session
    total_detections = Column(Integer)  # Number of detections in this session
    detections_data = Column(Text)  # JSON string of all detections
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="detection_histories")