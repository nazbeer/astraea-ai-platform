from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
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
    improve_model = Column(Integer, default=1)

    sessions = relationship("ChatSession", back_populates="owner")
    custom_models = relationship("CustomModel", back_populates="owner")

class CustomModel(Base):
    __tablename__ = "custom_models"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    description = Column(String)
    status = Column(String, default="Ready") # "Training", "Ready"
    base_model = Column(String, default="gpt-4o-mini")
    training_data = Column(String) # Stored text
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="custom_models")
    files = relationship("ModelFile", back_populates="model", cascade="all, delete-orphan")

class ModelFile(Base):
    __tablename__ = "model_files"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("custom_models.id"))
    filename = Column(String)
    file_path = Column(String)
    file_type = Column(String)
    extracted_text = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    model = relationship("CustomModel", back_populates="files")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, default="New Chat")
    is_archived = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(36), ForeignKey("chat_sessions.id"))
    role = Column(String) # "user" or "assistant"
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")
