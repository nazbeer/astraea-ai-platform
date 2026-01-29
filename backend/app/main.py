from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import models, schemas, auth
from app.database import engine, get_db
from app.security import authenticate
from app.rag import RAG
from app.agent import build_messages
from app.llm import stream_chat
from app.config import settings
from app.core_logging import logger

# Create Tables
models.Base.metadata.create_all(bind=engine)

log = logger()
app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG
try:
    docs = open("data/knowledge.txt").read().splitlines()
    rag = RAG(docs)
except Exception:
    rag = RAG([]) # Fallback

# --- Auth Endpoints ---
@app.post("/auth/signup")
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    return {"message": "User created successfully"}

@app.post("/auth/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# --- History Endpoints ---
@app.get("/history")
def get_history(current_user: models.User = Depends(authenticate), db: Session = Depends(get_db)):
    # Return list of sessions
    return [{"id": s.id, "title": s.title, "created_at": s.created_at} for s in current_user.sessions]

@app.get("/history/{session_id}")
def get_session_history(session_id: int, current_user: models.User = Depends(authenticate), db: Session = Depends(get_db)):
    # Verify ownership
    session = db.query(models.ChatSession).filter(models.ChatSession.id == session_id, models.ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return [{"role": m.role, "content": m.content} for m in session.messages]


# --- Chat Endpoint ---
@app.post("/chat")
async def chat(req: schemas.ChatRequest, current_user: models.User = Depends(authenticate), db: Session = Depends(get_db)):
    # 1. Get or Create Session
    if req.session_id:
        session = db.query(models.ChatSession).filter(models.ChatSession.id == req.session_id, models.ChatSession.user_id == current_user.id).first()
        if not session:
             raise HTTPException(status_code=404, detail="Session not found")
    else:
        # Create new session
        session = models.ChatSession(user_id=current_user.id, title=req.message[:50])
        db.add(session)
        db.commit()
        db.refresh(session)

    # 2. Save User Message
    user_msg = models.Message(session_id=session.id, role="user", content=req.message)
    db.add(user_msg)
    db.commit()

    # 3. Retrieve Context & History for LLM
    # Convert DB messages to list of dicts for agent
    history = [{"role": m.role, "content": m.content} for m in session.messages]
    # Remove the just-added message from history passed to LLM (or include it? build_messages appends user msg separately)
    # build_messages expects previous memory. Logic in agent.py: msgs.extend(memory) then appends user msg.
    # So we should exclude the last message we just added from 'memory' passed to build_messages
    memory_for_llm = history[:-1] 

    context = rag.retrieve(req.message)
    messages = build_messages(req.message, memory_for_llm, context)

    # 4. Stream & Save Assistant Message
    def stream():
        full_response = ""
        # Yield session ID first so frontend knows where to navigate/update
        yield f"SESSION_ID:{session.id}\n"
        
        for chunk in stream_chat(messages):
            token = chunk.choices[0].delta.content or ""
            full_response += token
            yield token
        
        # Save Assistant Message
        # We need a new DB session here because the generator runs outside the request context? 
        # Actually usually it's safer to use a new session or keep the outer one open. 
        # Simple approach: standard loop. DB session from Depends should still be valid if not closed.
        # But StreamingResponse runs in a separate thread/task.
        # Safer to create a new session just for saving this message.
        save_db = next(get_db())
        asst_msg = models.Message(session_id=session.id, role="assistant", content=full_response)
        save_db.add(asst_msg)
        save_db.commit()
        save_db.close()

    return StreamingResponse(stream(), media_type="text/plain")

@app.get("/")
def read_root():
    return {"message": "Astraea AI Platform V2"}
