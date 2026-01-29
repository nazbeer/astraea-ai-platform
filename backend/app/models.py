from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)  # Google email
    google_id = Column(String, unique=True, index=True)  # Google user ID
    username = Column(String)  # Display name from Google
    request_count = Column(Integer, default=0)
    tier = Column(String, default="Free") # "Free", "Pro"
    is_premium = Column(Integer, default=0) # SQLite/SQLAlchemy Boolean as Integer often safer in simple setups, or just use tier

    sessions = relationship("ChatSession", back_populates="owner")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, default="New Chat")
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    role = Column(String) # "user" or "assistant"
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")
