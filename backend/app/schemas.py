from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    session_id: Optional[int] = None
    message: str
    model: Optional[str] = "gpt-4o-mini"

class GoogleAuthRequest(BaseModel):
    token: str  # Google OAuth token from frontend

class Token(BaseModel):
    access_token: str
    token_type: str
