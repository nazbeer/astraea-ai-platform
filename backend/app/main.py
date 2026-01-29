from dotenv import load_dotenv
load_dotenv()

import json
from fastapi import FastAPI, Depends, HTTPException, status, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import os
import requests as py_requests
from app import doc_processor

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
    # Tier-based Quota (Inferences per cycle/month)
    QUOTAS = {
        "Free": 100,
        "Pro": 10000,
        "Enterprise": 999999
    }
    total_quota = QUOTAS.get(current_user.tier, 100)
    remaining_quota = max(0, total_quota - current_user.request_count)

    return {
        "id":current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "request_count": current_user.request_count,
        "tier": current_user.tier,
        "is_premium": bool(current_user.is_premium),
        "total_quota": total_quota,
        "remaining_quota": remaining_quota,
        "improve_model": bool(current_user.improve_model),
    }

@app.patch("/profile/settings")
def update_profile_settings(
    req: dict, # simple dict for toggle
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    if "improve_model" in req:
        current_user.improve_model = 1 if req["improve_model"] else 0
    db.commit()
    return {"message": "Settings updated"}

@app.post("/profile/export")
def export_user_data(
    current_user: models.User = Depends(authenticate),
):
    # Simulated export
    return {"message": "Data export requested. You will receive an email shortly."}

@app.get("/profile/usage")
def get_usage_stats(
    interval: str = "1month",
    start_date: str = None,
    end_date: str = None,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    today = datetime.utcnow()
    
    if start_date and end_date:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
        # Limit to 60 days
        if (end - start).days > 60:
            end = start + timedelta(days=60)
    else:
        if interval == "hours":
            start = today - timedelta(hours=24)
            end = today
        elif interval == "day":
            start = today - timedelta(days=1)
            end = today
        elif interval == "15days":
            start = today - timedelta(days=15)
            end = today
        elif interval == "60days":
            start = today - timedelta(days=60)
            end = today
        else: # 1month
            start = today - timedelta(days=30)
            end = today

    # Determine grouping - SQLite compatible
    if interval == "hours":
        group_func = func.strftime('%Y-%m-%dT%H:00:00', models.Message.created_at)
    else:
        group_func = func.date(models.Message.created_at)

    usage_query = (
        db.query(
            group_func.label("time_label"),
            func.count(models.Message.id).label("count")
        )
        .join(models.ChatSession)
        .filter(models.ChatSession.user_id == current_user.id)
        .filter(models.Message.created_at >= start)
        .filter(models.Message.created_at <= end)
        .group_by("time_label")
        .order_by("time_label")
        .all()
    )
    
    # Map results (ensure keys are strings as SQLite returns strings for group_func)
    usage_map = {str(u.time_label): u.count for u in usage_query}
    
    full_data = []
    if interval == "hours":
        curr = start.replace(minute=0, second=0, microsecond=0)
        while curr <= end:
            iso_key = curr.strftime('%Y-%m-%dT%H:00:00')
            full_data.append({
                "date": iso_key,
                "count": usage_map.get(iso_key, 0)
            })
            curr += timedelta(hours=1)
    else:
        curr = start.date()
        while curr <= end.date():
            date_key = curr.isoformat()
            full_data.append({
                "date": date_key,
                "count": usage_map.get(date_key, 0)
            })
            curr += timedelta(days=1)
    
    return full_data

@app.get("/models")
def list_models(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    return db.query(models.CustomModel).filter(models.CustomModel.user_id == current_user.id).all()

@app.post("/models")
def create_model(
    req: schemas.CustomModelCreate,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    new_model = models.CustomModel(
        user_id=current_user.id,
        name=req.name,
        description=req.description,
        base_model=req.base_model,
    )
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model

@app.post("/models/{model_id}/train")
def train_model(
    model_id: int,
    req: schemas.CustomModelTrain,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    model = db.query(models.CustomModel).filter(
        models.CustomModel.id == model_id,
        models.CustomModel.user_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    model.status = "Training"
    db.commit()
    
    # Simulate training by storing data and setting status
    model.training_data = req.training_data
    model.status = "Ready"
    db.commit()
    return model

@app.post("/models/{model_id}/upload")
async def upload_model_file(
    model_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    model = db.query(models.CustomModel).filter(
        models.CustomModel.id == model_id,
        models.CustomModel.user_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    content = await file.read()
    
    # Safety & Virus Check
    is_safe, msg = doc_processor.check_file_safety(file.filename, content)
    if not is_safe:
        raise HTTPException(status_code=400, detail=msg)

    # Extract Text
    extracted_text = doc_processor.extract_text(file.filename, content)
    
    # Save file record
    upload_dir = f"storage/models/{model_id}"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    
    with open(file_path, "wb") as f:
        f.write(content)

    model_file = models.ModelFile(
        model_id=model_id,
        filename=file.filename,
        file_path=file_path,
        file_type=file.content_type,
        extracted_text=extracted_text
    )
    db.add(model_file)
    db.commit()
    db.refresh(model_file)
    
    return {"id": model_file.id, "filename": model_file.filename}

@app.get("/models/{model_id}/files")
def list_model_files(
    model_id: int,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    model = db.query(models.CustomModel).filter(
        models.CustomModel.id == model_id,
        models.CustomModel.user_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
        
    return [{"id": f.id, "filename": f.filename, "created_at": f.created_at} for f in model.files]

@app.delete("/models/{model_id}")
def delete_model(
    model_id: int,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    model = db.query(models.CustomModel).filter(
        models.CustomModel.id == model_id,
        models.CustomModel.user_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
        
    db.delete(model)
    db.commit()
    return {"message": "Model deleted"}

@app.patch("/models/{model_id}")
def update_model(
    model_id: int,
    req: schemas.CustomModelUpdate,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    model = db.query(models.CustomModel).filter(
        models.CustomModel.id == model_id,
        models.CustomModel.user_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
        
    if req.name is not None:
        model.name = req.name
    if req.description is not None:
        model.description = req.description
    if req.base_model is not None:
        model.base_model = req.base_model
    if req.status is not None:
        model.status = req.status
        
    db.commit()
    db.refresh(model)
    return model

@app.post("/models/{model_id}/fetch-url")
def fetch_dataset_url(
    model_id: int,
    req: schemas.CustomModelTrain, # Reusing training_data as URL
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    model = db.query(models.CustomModel).filter(
        models.CustomModel.id == model_id,
        models.CustomModel.user_id == current_user.id
    ).first()
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    url = req.training_data
    try:
        response = py_requests.get(url, timeout=10)
        response.raise_for_status()
        
        # Simple text or JSON extraction
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' in content_type:
            extracted_text = json.dumps(response.json(), indent=2)
        else:
            # Maybe use doc_processor if it's a file URL?
            # For now, treat as plain text/html-to-text
            extracted_text = response.text[:50000] # Cap for safety

        # Save as a virtual file
        filename = url.split("/")[-1] or "web_dataset"
        if not filename.endswith((".txt", ".json")):
            filename += ".txt"

        model_file = models.ModelFile(
            model_id=model_id,
            filename=f"Web: {filename}",
            file_path=url,
            file_type="web/dataset",
            extracted_text=f"Fetched from {url}:\n\n{extracted_text}"
        )
        db.add(model_file)
        db.commit()
        return {"id": model_file.id, "filename": model_file.filename}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch dataset: {str(e)}")

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
        for s in current_user.sessions if not s.is_archived
    ]

@app.get("/history/archived")
def get_archived_history(
    current_user: models.User = Depends(authenticate),
):
    return [
        {
            "id": s.id,
            "title": s.title,
            "created_at": s.created_at,
        }
        for s in current_user.sessions if s.is_archived
    ]

@app.post("/history/{session_id}/archive")
def toggle_archive_session(
    session_id: str,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.is_archived = 0 if session.is_archived else 1
    db.commit()
    return {"message": "Session updated", "is_archived": bool(session.is_archived)}

@app.post("/history/archive-all")
def archive_all_sessions(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    db.query(models.ChatSession).filter(
        models.ChatSession.user_id == current_user.id
    ).update({models.ChatSession.is_archived: 1})
    db.commit()
    return {"message": "All sessions archived"}

@app.post("/history/delete-all")
def delete_all_sessions(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    db.query(models.ChatSession).filter(
        models.ChatSession.user_id == current_user.id
    ).delete()
    db.commit()
    return {"message": "All sessions deleted"}


@app.get("/history/{session_id}")
def get_session_history(
    session_id: str,
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

    # Determine actual OpenAI model
    openai_model = req.model
    custom_knowledge = []
    if req.model and req.model.startswith("custom-"):
        try:
            m_id = int(req.model.split("-")[1])
            c_model = db.query(models.CustomModel).filter(models.CustomModel.id == m_id).first()
            if c_model:
                openai_model = c_model.base_model or "gpt-4o-mini"
                # Increment usage
                c_model.usage_count += 1
                db.commit()
                
                if c_model.training_data:
                    custom_knowledge.append(c_model.training_data)
                
                # Fetch all extracted text from associated files
                for f in c_model.files:
                    if f.extracted_text:
                        custom_knowledge.append(f"Content from {f.filename}:\n{f.extracted_text}")
        except:
            openai_model = "gpt-4o-mini"

    context = rag.retrieve(req.message)
    if custom_knowledge:
        # Push custom knowledge as highest priority context
        joined_custom = "\n\n---\n\n".join(custom_knowledge)
        context.insert(0, f"CORE CUSTOM MODEL KNOWLEDGE:\n{joined_custom}")

    is_custom_model = req.model and req.model.startswith("custom-")

    messages = build_messages(req.message, history, context, is_custom_model=is_custom_model)

    # 5. Tool decision step
    response = chat_completion(
        messages,
        tools=TOOLS_DEFINITION,
        model=openai_model,
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

        for chunk in stream_chat(messages, model=openai_model):
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
