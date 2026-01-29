from dotenv import load_dotenv
load_dotenv()

import json
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
from app.llm import stream_chat, chat_completion
from app.config import settings
from app.core_logging import logger
from app.tools import TOOLS_DEFINITION, AVAILABLE_TOOLS

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
    # Return additional info if needed, but token response is standard
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# --- User & Profile Endpoints ---
@app.get("/profile")
def get_profile(current_user: models.User = Depends(authenticate), db: Session = Depends(get_db)):
    return {
        "username": current_user.username,
        "request_count": current_user.request_count,
        "tier": current_user.tier,
        "is_premium": bool(current_user.is_premium)
    }

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


# --- Chat Endpoint (Agentic) ---
@app.post("/chat")
async def chat(req: schemas.ChatRequest, current_user: models.User = Depends(authenticate), db: Session = Depends(get_db)):
    # 0. Increment Usage
    current_user.request_count += 1
    db.commit()
    
    # Check Premium limits (optional - skipped for now)

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

    # 3. Build Context
    history = [{"role": m.role, "content": m.content} for m in session.messages]
    # Remove the just-added user message from history because build_messages adds it
    memory_for_llm = history[:-1] 

    context = rag.retrieve(req.message) # Keep RAG as context injection
    messages = build_messages(req.message, memory_for_llm, context)

    # 4. Agent Loop
    # Step 1: Check for Tools (Synchronous)
    response = chat_completion(messages, tools=TOOLS_DEFINITION, model=req.model)
    response_message = response.choices[0].message
    tool_calls = response_message.tool_calls

    if tool_calls:
        # Append assistant's "tool call" message to history
        messages.append(response_message)
        
        # Execute tools
        for tool_call in tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            
            # Execute
            function_to_call = AVAILABLE_TOOLS.get(function_name)
            if function_name == "rag_retrieve":
                 # Special handling if we made RAG a tool (optional, but RAG is already injected above)
                 function_response = rag.retrieve(function_args.get("query"))
                 function_response = "\n".join(function_response)
            elif function_to_call:
                try:
                    function_response = str(function_to_call(**function_args))
                except Exception as e:
                    function_response = f"Error: {e}"
            else:
                function_response = "Error: Tool not found"

            # Append tool result
            messages.append(
                {
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": function_response,
                }
            )

    # 5. Final Stream Response
    # Stream the final answer (either direct or after tool use)
    def stream():
        full_response = ""
        # Yield session ID first
        yield f"SESSION_ID:{session.id}\n"
        
        # If tool was used, we iterate again. 
        # If no tool, messages is simple.
        for chunk in stream_chat(messages, model=req.model):
            token = chunk.choices[0].delta.content or ""
            full_response += token
            yield token
        
        # Save Assistant Message
        save_db = next(get_db())
        asst_msg = models.Message(session_id=session.id, role="assistant", content=full_response)
        save_db.add(asst_msg)
        save_db.commit()
        save_db.close()

    return StreamingResponse(stream(), media_type="text/plain")

@app.get("/")
def read_root():
    return {"message": "Astraea AI Platform V2"}
