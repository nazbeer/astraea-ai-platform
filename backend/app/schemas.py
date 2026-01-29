from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    model: Optional[str] = "gpt-4o-mini"

class GoogleAuthRequest(BaseModel):
    token: str  # Google OAuth token from frontend

class Token(BaseModel):
    access_token: str
    token_type: str

class CustomModelCreate(BaseModel):
    name: str
    description: Optional[str] = None
    base_model: Optional[str] = "gpt-4o-mini"

class CustomModelTrain(BaseModel):
    training_data: str

class CustomModelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_model: Optional[str] = None
    status: Optional[str] = None

class CustomModelBase(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    base_model: str
    usage_count: int
    # created_at: Optional[str] = None

    class Config:
        from_attributes = True # SQLAlchemy 2.0 / Pydantic 2.0 style
