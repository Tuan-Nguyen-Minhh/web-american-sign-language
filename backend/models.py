from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Blog(Base):
    __tablename__ = "blogs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    body = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'))

    creator = relationship("User", back_populates="blogs")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String)
    password = Column(String)
    total_detection_sessions = Column(Integer, default=0)  # Count all sessions (saved or not)

    blogs = relationship("Blog", back_populates="creator")
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