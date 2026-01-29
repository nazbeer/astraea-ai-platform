from dotenv import load_dotenv
load_dotenv()

import json
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app import models, schemas, auth
from app.database import engine, get_db
from app.security import authenticate
from app.rag import RAG
from app.agent import build_messages
from app.llm import stream_chat, chat_completion
from app.config import settings
from app.core_logging import logger
from app.tools import TOOLS_DEFINITION, AVAILABLE_TOOLS

# --------------------------------------------------
# Setup
# --------------------------------------------------

models.Base.metadata.create_all(bind=engine)

log = logger()
app = FastAPI(title=settings.APP_NAME)

# --------------------------------------------------
# CORS (OAuth + JWT SAFE)
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://astraea-ai.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# RAG Initialization
# --------------------------------------------------

try:
    docs = open("data/knowledge.txt").read().splitlines()
    rag = RAG(docs)
except Exception as e:
    log.error(f"RAG init failed: {e}")
    rag = RAG([])

# --------------------------------------------------
# Health
# --------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}

# --------------------------------------------------
# Google Auth (Token-Based, No Redirects)
# --------------------------------------------------

@app.post("/auth/google", response_model=schemas.Token)
def google_auth(
    auth_request: schemas.GoogleAuthRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate user using Google ID token from frontend.
    """
    print(f"Received Google auth request")
    user_info = auth.verify_google_token(auth_request.token)

    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

    user = (
        db.query(models.User)
        .filter(models.User.google_id == user_info["google_id"])
        .first()
    )

    if not user:
        user = models.User(
            email=user_info["email"],
            google_id=user_info["google_id"],
            username=user_info["name"],
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.email = user_info["email"]
        user.username = user_info["name"]
        db.commit()

    access_token = auth.create_access_token(data={"sub": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

# --------------------------------------------------
# Profile
# --------------------------------------------------

@app.get("/profile")
def get_profile(
    current_user: models.User = Depends(authenticate),
):
    return {
        "id":current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "request_count": current_user.request_count,
        "tier": current_user.tier,
        "is_premium": bool(current_user.is_premium),
    }

@app.get("/profile/usage")
def get_usage_stats(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    # Get message counts grouped by day for last 30 days
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=29)
    
    usage_query = (
        db.query(
            func.date(models.Message.created_at).label("date"),
            func.count(models.Message.id).label("count")
        )
        .join(models.ChatSession)
        .filter(models.ChatSession.user_id == current_user.id)
        .filter(models.Message.created_at >= start_date)
        .group_by(func.date(models.Message.created_at))
        .all()
    )
    
    # Map query results for quick lookup
    usage_map = {u.date: u.count for u in usage_query}
    
    # Fill in all 30 days (including zeros)
    full_data = []
    for i in range(30):
        day = (start_date + timedelta(days=i)).isoformat()
        full_data.append({
            "date": day,
            "count": usage_map.get(day, 0)
        })
    
    return full_data

# --------------------------------------------------
# History
# --------------------------------------------------

@app.get("/history")
def get_history(
    current_user: models.User = Depends(authenticate),
):
    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at,
        }
        for s in current_user.sessions
    ]


@app.get("/history/{session_id}")
def get_session_history(
    session_id: int,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    session = (
        db.query(models.ChatSession)
        .filter(
            models.ChatSession.id == session_id,
            models.ChatSession.user_id == current_user.id,
        )
        .first()
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return [
        {"role": m.role, "content": m.content}
        for m in session.messages
    ]

# --------------------------------------------------
# Chat (Agentic + Streaming)
# --------------------------------------------------

@app.post("/chat")
async def chat(
    req: schemas.ChatRequest,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    # 1. Usage tracking
    current_user.request_count += 1
    db.commit()

    # 2. Get or create session
    if req.session_id:
        session = (
            db.query(models.ChatSession)
            .filter(
                models.ChatSession.id == req.session_id,
                models.ChatSession.user_id == current_user.id,
            )
            .first()
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        session = models.ChatSession(
            user_id=current_user.id,
            title=req.message[:50],
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # 3. Save user message
    user_msg = models.Message(
        session_id=session.id,
        role="user",
        content=req.message,
    )
    db.add(user_msg)
    db.commit()

    # 4. Build memory + context
    history = [
        {"role": m.role, "content": m.content}
        for m in session.messages[:-1]
    ]

    context = rag.retrieve(req.message)
    messages = build_messages(req.message, history, context)

    # 5. Tool decision step
    response = chat_completion(
        messages,
        tools=TOOLS_DEFINITION,
        model=req.model,
    )

    tool_calls = response.choices[0].message.tool_calls

    if tool_calls:
        messages.append(response.choices[0].message)

        for tool_call in tool_calls:
            fn_name = tool_call.function.name
            fn_args = json.loads(tool_call.function.arguments)

            if fn_name == "rag_retrieve":
                tool_output = "\n".join(
                    rag.retrieve(fn_args.get("query", ""))
                )
            else:
                fn = AVAILABLE_TOOLS.get(fn_name)
                try:
                    tool_output = str(fn(**fn_args)) if fn else "Tool not found"
                except Exception as e:
                    tool_output = f"Tool error: {e}"

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": fn_name,
                    "content": tool_output,
                }
            )

    # 6. Streaming final answer (SAFE DB USAGE)
    def stream_response(db_session: Session):
        full_response = ""

        # Send session id once
        yield f"SESSION_ID:{session.id}\n"

        for chunk in stream_chat(messages, model=req.model):
            token = chunk.choices[0].delta.content or ""
            full_response += token
            yield token

        asst_msg = models.Message(
            session_id=session.id,
            role="assistant",
            content=full_response,
        )
        db_session.add(asst_msg)
        db_session.commit()

    return StreamingResponse(
        stream_response(db),
        media_type="text/plain",
    )

# --------------------------------------------------
# Root
# --------------------------------------------------

@app.get("/")
def root():
    return {"message": "Astraea AI Platform v2"}
