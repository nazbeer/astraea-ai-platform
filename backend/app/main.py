from dotenv import load_dotenv
load_dotenv()

import json
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import os
import requests as py_requests
from app import doc_processor

from app import models, schemas, auth
from app.database import engine, get_db, is_postgres, SQLALCHEMY_DATABASE_URL
from app.security import authenticate
from app.auth import SECRET_KEY, ALGORITHM
from jose import JWTError, jwt
from app.rag import RAG
from app.agent import build_messages
from app.llm import stream_chat, chat_completion
from app.config import settings
from app.core_logging import logger
from app.tools import TOOLS_DEFINITION, AVAILABLE_TOOLS
from app.resume_generator import resume_generator
from app.matching import matcher
from app.resume_parser import resume_parser
from app.job_fetcher import job_fetcher
from app.billing import billing_manager, track_usage, SUBSCRIPTION_PLANS, CREDIT_PACKS, JOB_POSTING_PACKAGES

# --------------------------------------------------
# Setup
# --------------------------------------------------

models.Base.metadata.create_all(bind=engine)

log = logger()
app = FastAPI(title=settings.APP_NAME)

# Log database info (mask credentials)
if is_postgres:
    log.info("Using PostgreSQL database")
else:
    log.info(f"Using SQLite database: {SQLALCHEMY_DATABASE_URL}")

# --------------------------------------------------
# CORS (OAuth + JWT SAFE)
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://astraea-ai.vercel.app",
        "https://aiastraea.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
    max_age=86400,  # Cache preflight for 24 hours
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

    # Calculate credits remaining
    credits_remaining = -1 if current_user.tier in ["pro", "enterprise"] else max(0, current_user.credits - current_user.credits_used)
    if current_user.tier == "free":
        credits_remaining = max(0, current_user.credits - current_user.credits_used)

    return {
        "id":current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "user_type": current_user.user_type,
        "request_count": current_user.request_count,
        "tier": current_user.tier,
        "is_premium": bool(current_user.is_premium),
        "total_quota": total_quota,
        "remaining_quota": remaining_quota,
        "improve_model": bool(current_user.improve_model),
        "credits": current_user.credits,
        "credits_used": current_user.credits_used,
        "credits_remaining": credits_remaining,
        "subscription_status": current_user.subscription_status,
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


# --------------------------------------------------
# User Type Management
# --------------------------------------------------

@app.patch("/profile/user-type")
def update_user_type(
    req: schemas.UserTypeUpdate,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Update user type (candidate or organization)."""
    if req.user_type not in ["candidate", "organization"]:
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    current_user.user_type = req.user_type
    db.commit()
    
    return {"message": f"User type updated to {req.user_type}", "user_type": req.user_type}


# --------------------------------------------------
# Resume Management (For Candidates)
# --------------------------------------------------

import ast

@app.get("/resume")
def get_resume(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Get the current user's resume."""
    resume = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Helper function to parse JSON fields that might be stored as strings
    def parse_json_field(field_value):
        if field_value is None:
            return []
        if isinstance(field_value, list):
            # Check if items are strings that look like dicts
            parsed = []
            for item in field_value:
                if isinstance(item, str) and item.startswith('{') and item.endswith('}'):
                    try:
                        # Use ast.literal_eval to safely parse Python dict strings
                        parsed_item = ast.literal_eval(item)
                        if isinstance(parsed_item, dict):
                            parsed.append(parsed_item)
                        else:
                            parsed.append(item)
                    except (ValueError, SyntaxError):
                        parsed.append(item)
                else:
                    parsed.append(item)
            return parsed
        return field_value
    
    # Build response manually to handle JSON parsing
    return {
        "id": resume.id,
        "user_id": resume.user_id,
        "full_name": resume.full_name,
        "email": resume.email,
        "phone": resume.phone,
        "location": resume.location,
        "linkedin_url": resume.linkedin_url,
        "portfolio_url": resume.portfolio_url,
        "github_url": resume.github_url,
        "twitter_url": resume.twitter_url,
        "medium_url": resume.medium_url,
        "dribbble_url": resume.dribbble_url,
        "other_url": resume.other_url,
        "summary": resume.summary,
        "work_experience": parse_json_field(resume.work_experience),
        "education": parse_json_field(resume.education),
        "skills": resume.skills if resume.skills else [],
        "certifications": parse_json_field(resume.certifications),
        "projects": parse_json_field(resume.projects),
        "languages": parse_json_field(resume.languages),
        "ats_score": resume.ats_score,
        "keywords": resume.keywords if resume.keywords else [],
        "is_public": resume.is_public,
        "is_active": resume.is_active,
        "expected_salary_min": resume.expected_salary_min,
        "expected_salary_max": resume.expected_salary_max,
        "preferred_location": resume.preferred_location,
        "remote_preference": resume.remote_preference,
        "pdf_url": resume.pdf_url,
        "docx_url": resume.docx_url,
    }


@app.get("/resume/download/{file_type}")
def download_resume(
    file_type: str,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Download resume PDF or DOCX file."""
    resume = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if file_type == "pdf":
        if not resume.pdf_url or not os.path.exists(resume.pdf_url):
            raise HTTPException(status_code=404, detail="PDF not found. Generate it first.")
        return FileResponse(
            resume.pdf_url,
            media_type="application/pdf",
            filename=f"{resume.full_name.replace(' ', '_')}_resume.pdf"
        )
    elif file_type == "docx":
        if not resume.docx_url or not os.path.exists(resume.docx_url):
            raise HTTPException(status_code=404, detail="DOCX not found. Generate it first.")
        return FileResponse(
            resume.docx_url,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=f"{resume.full_name.replace(' ', '_')}_resume.docx"
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid file type. Use 'pdf' or 'docx'.")


@app.get("/resumes/{resume_id}/download/{file_type}")
def download_candidate_resume(
    resume_id: int,
    file_type: str,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Download a candidate's resume (for organizations only)."""
    # Check if user is an organization
    if current_user.user_type != "organization":
        raise HTTPException(status_code=403, detail="Only organizations can download candidate resumes")
    
    # Get the company
    company = db.query(models.Company).filter(models.Company.owner_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=403, detail="Company profile required")
    
    # Get the resume
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Check if the candidate has applied to any of the company's jobs
    has_applied = db.query(models.JobApplication).join(models.Job).filter(
        models.JobApplication.resume_id == resume_id,
        models.Job.company_id == company.id
    ).first()
    
    if not has_applied:
        raise HTTPException(status_code=403, detail="You can only download resumes of candidates who applied to your jobs")
    
    if file_type == "pdf":
        if not resume.pdf_url or not os.path.exists(resume.pdf_url):
            raise HTTPException(status_code=404, detail="PDF not found")
        return FileResponse(
            resume.pdf_url,
            media_type="application/pdf",
            filename=f"{resume.full_name.replace(' ', '_')}_resume.pdf"
        )
    elif file_type == "docx":
        if not resume.docx_url or not os.path.exists(resume.docx_url):
            raise HTTPException(status_code=404, detail="DOCX not found")
        return FileResponse(
            resume.docx_url,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=f"{resume.full_name.replace(' ', '_')}_resume.docx"
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid file type")


@app.post("/resume", response_model=schemas.ResumeResponse)
def create_resume(
    req: schemas.ResumeCreate,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Create or update a resume."""
    # Check if resume already exists
    existing = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).first()
    
    # Calculate ATS score and extract keywords
    resume_data = req.dict()
    resume_data['user_id'] = current_user.id
    ats_result = resume_generator.calculate_ats_score(resume_data)
    
    if existing:
        # Update existing resume
        for field, value in req.dict().items():
            setattr(existing, field, value)
        existing.ats_score = ats_result['score']
        existing.keywords = ats_result['keywords']
        existing.updated_at = datetime.utcnow()
        resume = existing
    else:
        # Create new resume
        resume = models.Resume(
            user_id=current_user.id,
            ats_score=ats_result['score'],
            keywords=ats_result['keywords'],
            **req.dict()
        )
        db.add(resume)
    
    db.commit()
    db.refresh(resume)
    return resume


@app.put("/resume", response_model=schemas.ResumeResponse)
def update_resume(
    req: schemas.ResumeUpdate,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Update resume fields."""
    resume = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Update fields
    update_data = req.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resume, field, value)
    
    # Recalculate ATS score
    resume_data = {
        'user_id': current_user.id,
        'full_name': resume.full_name,
        'email': resume.email,
        'phone': resume.phone,
        'location': resume.location,
        'linkedin_url': resume.linkedin_url,
        'portfolio_url': resume.portfolio_url,
        'github_url': resume.github_url,
        'twitter_url': resume.twitter_url,
        'medium_url': resume.medium_url,
        'dribbble_url': resume.dribbble_url,
        'other_url': resume.other_url,
        'summary': resume.summary,
        'work_experience': resume.work_experience,
        'education': resume.education,
        'skills': resume.skills,
        'certifications': resume.certifications,
        'projects': resume.projects,
        'languages': resume.languages,
    }
    ats_result = resume_generator.calculate_ats_score(resume_data)
    resume.ats_score = ats_result['score']
    resume.keywords = ats_result['keywords']
    resume.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(resume)
    return resume


@app.get("/resume/generate-pdf")
def generate_resume_pdf(
    template: str = "modern",
    download: bool = True,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """
    Generate PDF version of resume.
    
    Args:
        template: Resume template - 'modern', 'classic', or 'minimal'
        download: If True, returns the file for direct download (default: True)
    """
    resume = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found. Create a resume first.")
    
    # Validate template
    if template not in resume_generator.TEMPLATES:
        template = "modern"
    
    resume_data = {
        'user_id': current_user.id,
        'full_name': resume.full_name,
        'email': resume.email,
        'phone': resume.phone,
        'location': resume.location,
        'linkedin_url': resume.linkedin_url,
        'portfolio_url': resume.portfolio_url,
        'github_url': resume.github_url,
        'twitter_url': resume.twitter_url,
        'medium_url': resume.medium_url,
        'dribbble_url': resume.dribbble_url,
        'other_url': resume.other_url,
        'summary': resume.summary,
        'work_experience': resume.work_experience,
        'education': resume.education,
        'skills': resume.skills,
        'certifications': resume.certifications,
        'projects': resume.projects,
        'languages': resume.languages,
    }
    
    filename = f"resume_{current_user.username or 'user'}_{template}_{int(datetime.now().timestamp())}.pdf"
    
    if download:
        # Return file for direct download
        pdf_bytes = resume_generator.generate_pdf(resume_data, filename, template=template, return_bytes=True)
        
        from fastapi.responses import StreamingResponse
        import io
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    else:
        # Save to server and return URL
        filepath = resume_generator.generate_pdf(resume_data, filename, template=template)
        
        # Update resume with PDF URL
        resume.pdf_url = filepath
        db.commit()
        
        return {
            "message": "PDF generated successfully", 
            "pdf_url": filepath,
            "template": template,
            "template_name": resume_generator.TEMPLATES[template]
        }


@app.get("/resume/generate-docx")
def generate_resume_docx(
    template: str = "modern",
    download: bool = True,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """
    Generate DOCX version of resume.
    
    Args:
        template: Resume template - 'modern', 'classic', or 'minimal'
        download: If True, returns the file for direct download (default: True)
    """
    resume = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found. Create a resume first.")
    
    # Validate template
    if template not in resume_generator.TEMPLATES:
        template = "modern"
    
    resume_data = {
        'user_id': current_user.id,
        'full_name': resume.full_name,
        'email': resume.email,
        'phone': resume.phone,
        'location': resume.location,
        'linkedin_url': resume.linkedin_url,
        'portfolio_url': resume.portfolio_url,
        'github_url': resume.github_url,
        'twitter_url': resume.twitter_url,
        'medium_url': resume.medium_url,
        'dribbble_url': resume.dribbble_url,
        'other_url': resume.other_url,
        'summary': resume.summary,
        'work_experience': resume.work_experience,
        'education': resume.education,
        'skills': resume.skills,
        'certifications': resume.certifications,
        'projects': resume.projects,
        'languages': resume.languages,
    }
    
    filename = f"resume_{current_user.username or 'user'}_{template}_{int(datetime.now().timestamp())}.docx"
    
    if download:
        # Return file for direct download
        docx_bytes = resume_generator.generate_docx(resume_data, filename, template=template, return_bytes=True)
        
        from fastapi.responses import StreamingResponse
        import io
        
        return StreamingResponse(
            io.BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    else:
        # Save to server and return URL
        filepath = resume_generator.generate_docx(resume_data, filename, template=template)
        
        # Update resume with DOCX URL
        resume.docx_url = filepath
        db.commit()
        
        return {
            "message": "DOCX generated successfully", 
            "docx_url": filepath,
            "template": template,
            "template_name": resume_generator.TEMPLATES[template]
        }


def authenticate_with_query_token(
    token: str = None,
    db: Session = Depends(get_db)
):
    """Authenticate using token from query param (for iframe) or header."""
    from fastapi.security.utils import get_authorization_scheme_param
    from starlette.requests import Request
    
    # Try to get token from query param first (for iframe)
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                raise HTTPException(status_code=401, detail="Invalid token")
            user = db.query(models.User).filter(models.User.email == email).first()
            if user is None:
                raise HTTPException(status_code=401, detail="User not found")
            return user
        except JWTError:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    # Fall back to header authentication
    raise HTTPException(status_code=401, detail="Token required")


@app.get("/resume/preview")
def preview_resume(
    template: str = "modern",
    token: str = None,
    current_user: models.User = Depends(authenticate_with_query_token),
    db: Session = Depends(get_db),
):
    """
    Generate and return PDF preview of resume for browser viewing.
    
    Args:
        template: Resume template - 'modern', 'classic', or 'minimal'
        token: Token query param for iframe support
    """
    resume = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found. Create a resume first.")
    
    # Validate template
    if template not in resume_generator.TEMPLATES:
        template = "modern"
    
    resume_data = {
        'user_id': current_user.id,
        'full_name': resume.full_name,
        'email': resume.email,
        'phone': resume.phone,
        'location': resume.location,
        'linkedin_url': resume.linkedin_url,
        'portfolio_url': resume.portfolio_url,
        'github_url': resume.github_url,
        'twitter_url': resume.twitter_url,
        'medium_url': resume.medium_url,
        'dribbble_url': resume.dribbble_url,
        'other_url': resume.other_url,
        'summary': resume.summary,
        'work_experience': resume.work_experience,
        'education': resume.education,
        'skills': resume.skills,
        'certifications': resume.certifications,
        'projects': resume.projects,
        'languages': resume.languages,
    }
    
    filename = f"preview_{current_user.username or 'user'}_{template}.pdf"
    pdf_bytes = resume_generator.generate_pdf(resume_data, filename, template=template, return_bytes=True)
    
    from fastapi.responses import StreamingResponse
    import io
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename={filename}",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.get("/resume/templates")
def get_resume_templates():
    """Get available resume templates."""
    return {
        "templates": [
            {"id": "modern", "name": "Modern ATS-Friendly", "description": "Clean, professional design with clear section headers. Best for tech and corporate roles."},
            {"id": "classic", "name": "Classic Professional", "description": "Traditional serif fonts with elegant styling. Best for conservative industries."},
            {"id": "minimal", "name": "Minimal Clean", "description": "Simple, whitespace-focused design. Best for creative and design roles."}
        ]
    }


@app.get("/resume/ats-score")
def get_ats_score(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Get ATS score and suggestions for resume."""
    resume = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    resume_data = {
        'full_name': resume.full_name,
        'email': resume.email,
        'phone': resume.phone,
        'location': resume.location,
        'linkedin_url': resume.linkedin_url,
        'portfolio_url': resume.portfolio_url,
        'github_url': resume.github_url,
        'twitter_url': resume.twitter_url,
        'medium_url': resume.medium_url,
        'dribbble_url': resume.dribbble_url,
        'other_url': resume.other_url,
        'summary': resume.summary,
        'work_experience': resume.work_experience,
        'education': resume.education,
        'skills': resume.skills,
        'certifications': resume.certifications,
        'projects': resume.projects,
        'languages': resume.languages,
    }
    
    result = resume_generator.calculate_ats_score(resume_data)
    return result


@app.options("/resume/upload")
async def upload_resume_options():
    """Handle CORS preflight for resume upload."""
    return {"message": "OK"}


@app.post("/resume/upload")
async def upload_and_parse_resume(
    file: UploadFile = File(...),
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Upload a PDF or DOCX resume and parse it to auto-fill resume data."""
    # Validate file type
    allowed_types = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    file_ext = file.filename.lower().split('.')[-1]
    
    if file_ext not in ['pdf', 'docx']:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file format. Only PDF and DOCX files are supported."
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Parse resume
        result = resume_parser.parse_file(content, file.filename)
        parsed_data = result["parsed_data"]
        ats_score = result["ats_score"]
        
        # Check if user already has a resume
        existing_resume = db.query(models.Resume).filter(
            models.Resume.user_id == current_user.id
        ).first()
        
        if existing_resume:
            # Update existing resume with parsed data
            for field, value in parsed_data.items():
                if value and hasattr(existing_resume, field):
                    # For lists, merge with existing instead of replacing
                    if isinstance(value, list) and getattr(existing_resume, field):
                        existing_list = getattr(existing_resume, field) or []
                        
                        # Handle different list types appropriately
                        if field in ['work_experience', 'education', 'projects', 'certifications']:
                            # For complex objects, check if unique by key fields before adding
                            merged_list = existing_list.copy()
                            for new_item in value:
                                if isinstance(new_item, dict):
                                    # Check if this item already exists (by comparing key fields)
                                    is_duplicate = False
                                    for existing_item in existing_list:
                                        if isinstance(existing_item, dict):
                                            # For work_experience, compare title + company
                                            if field == 'work_experience':
                                                if (new_item.get('title') == existing_item.get('title') and 
                                                    new_item.get('company') == existing_item.get('company')):
                                                    is_duplicate = True
                                                    break
                                            # For education, compare degree + institution
                                            elif field == 'education':
                                                if (new_item.get('degree') == existing_item.get('degree') and 
                                                    new_item.get('institution') == existing_item.get('institution')):
                                                    is_duplicate = True
                                                    break
                                            # For projects, compare name
                                            elif field == 'projects':
                                                if new_item.get('name') == existing_item.get('name'):
                                                    is_duplicate = True
                                                    break
                                            # For certifications, compare name
                                            elif field == 'certifications':
                                                if new_item.get('name') == existing_item.get('name'):
                                                    is_duplicate = True
                                                    break
                                    if not is_duplicate:
                                        merged_list.append(new_item)
                                else:
                                    # Simple string item
                                    if new_item not in existing_list:
                                        merged_list.append(new_item)
                            setattr(existing_resume, field, merged_list)
                        elif field == 'skills':
                            # For skills, merge and deduplicate (case-insensitive)
                            existing_skills = set(s.lower() for s in existing_list if isinstance(s, str))
                            merged_skills = existing_list.copy()
                            for new_skill in value:
                                if isinstance(new_skill, str) and new_skill.lower() not in existing_skills:
                                    merged_skills.append(new_skill)
                                    existing_skills.add(new_skill.lower())
                            setattr(existing_resume, field, merged_skills)
                        else:
                            # For simple lists (languages, etc.), just replace
                            setattr(existing_resume, field, value)
                    else:
                        setattr(existing_resume, field, value)
            
            existing_resume.ats_score = ats_score
            existing_resume.updated_at = datetime.utcnow()
            resume = existing_resume
        else:
            # Create new resume with parsed data
            resume_data = {
                "user_id": current_user.id,
                "full_name": parsed_data.get("full_name", current_user.username or ""),
                "email": parsed_data.get("email", current_user.email or ""),
                "phone": parsed_data.get("phone", ""),
                "location": parsed_data.get("location", ""),
                "linkedin_url": parsed_data.get("linkedin_url", ""),
                "portfolio_url": parsed_data.get("portfolio_url", ""),
                "github_url": parsed_data.get("github_url", ""),
                "twitter_url": parsed_data.get("twitter_url", ""),
                "medium_url": parsed_data.get("medium_url", ""),
                "dribbble_url": parsed_data.get("dribbble_url", ""),
                "other_url": parsed_data.get("other_url", ""),
                "summary": parsed_data.get("summary", ""),
                "skills": parsed_data.get("skills", []),
                "work_experience": parsed_data.get("work_experience", []),
                "education": parsed_data.get("education", []),
                "certifications": parsed_data.get("certifications", []),
                "projects": parsed_data.get("projects", []),
                "languages": parsed_data.get("languages", []),
                "ats_score": ats_score,
                "keywords": parsed_data.get("skills", []),
            }
            
            resume = models.Resume(**resume_data)
            db.add(resume)
        
        db.commit()
        db.refresh(resume)
        
        return {
            "message": "Resume uploaded and parsed successfully",
            "parsed_data": parsed_data,
            "ats_score": ats_score,
            "resume_id": resume.id,
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse resume: {str(e)}")


# --------------------------------------------------
# Company Management (For Organizations)
# --------------------------------------------------

@app.post("/companies", response_model=schemas.CompanyResponse)
def create_company(
    req: schemas.CompanyCreate,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Create a company profile."""
    # Check if user already has a company
    existing = db.query(models.Company).filter(models.Company.owner_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already has a company profile")
    
    company = models.Company(owner_id=current_user.id, **req.dict())
    db.add(company)
    db.commit()
    db.refresh(company)
    
    # Update user type to organization
    current_user.user_type = "organization"
    db.commit()
    
    return company


@app.get("/companies/my", response_model=Optional[schemas.CompanyResponse])
def get_my_company(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Get the current user's company."""
    company = db.query(models.Company).filter(models.Company.owner_id == current_user.id).first()
    return company


@app.put("/companies/my", response_model=schemas.CompanyResponse)
def update_company(
    req: schemas.CompanyUpdate,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Update company profile."""
    company = db.query(models.Company).filter(models.Company.owner_id == current_user.id).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    update_data = req.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    
    company.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(company)
    return company


# --------------------------------------------------
# Job Management
# --------------------------------------------------

@app.post("/jobs", response_model=schemas.JobResponse)
def create_job(
    req: schemas.JobCreate,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Post a new job."""
    # Check if user has a company
    company = db.query(models.Company).filter(models.Company.owner_id == current_user.id).first()
    
    if not company:
        raise HTTPException(status_code=400, detail="Create a company profile first")
    
    # Extract keywords from job description and requirements
    keywords = []
    if req.description:
        # Simple keyword extraction (in production, use NLP)
        import re
        words = re.findall(r'\b[A-Za-z]{4,}\b', req.description.lower())
        keywords = list(set(words))[:50]  # Top 50 keywords
    
    keywords.extend([s.lower() for s in req.required_skills])
    keywords.extend([s.lower() for s in req.nice_to_have_skills])
    
    job = models.Job(
        company_id=company.id,
        posted_by_id=current_user.id,
        keywords=list(set(keywords)),
        **req.dict()
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    return job


@app.get("/jobs")
def search_jobs(
    query: Optional[str] = None,
    location: Optional[str] = None,
    is_remote: Optional[bool] = None,
    is_hybrid: Optional[bool] = None,
    employment_type: Optional[str] = None,
    experience_level: Optional[str] = None,
    category: Optional[str] = None,
    salary_min: Optional[int] = None,
    salary_max: Optional[int] = None,
    skills: Optional[str] = None,  # Comma-separated list
    include_external: bool = True,  # Include jobs from external APIs
    page: int = 1,
    limit: int = 20,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Search and filter jobs from both database and external sources."""
    jobs_query = db.query(models.Job).filter(models.Job.status == "active")
    
    # Apply filters
    if query:
        search = f"%{query}%"
        jobs_query = jobs_query.filter(
            (models.Job.title.ilike(search)) |
            (models.Job.description.ilike(search)) |
            (models.Job.company.has(models.Company.name.ilike(search)))
        )
    
    if location:
        jobs_query = jobs_query.filter(models.Job.location.ilike(f"%{location}%"))
    
    if is_remote is not None:
        jobs_query = jobs_query.filter(models.Job.is_remote == (1 if is_remote else 0))
    
    if is_hybrid is not None:
        jobs_query = jobs_query.filter(models.Job.is_hybrid == (1 if is_hybrid else 0))
    
    if employment_type:
        jobs_query = jobs_query.filter(models.Job.employment_type == employment_type)
    
    if experience_level:
        jobs_query = jobs_query.filter(models.Job.experience_level == experience_level)
    
    if category:
        jobs_query = jobs_query.filter(models.Job.category == category)
    
    if salary_min is not None:
        jobs_query = jobs_query.filter(models.Job.salary_max >= salary_min)
    
    if salary_max is not None:
        jobs_query = jobs_query.filter(models.Job.salary_min <= salary_max)
    
    if skills:
        skill_list = [s.strip().lower() for s in skills.split(",")]
        for skill in skill_list:
            jobs_query = jobs_query.filter(
                models.Job.required_skills.contains([skill]) |
                models.Job.nice_to_have_skills.contains([skill])
            )
    
    # Order by newest first
    jobs_query = jobs_query.order_by(models.Job.created_at.desc())
    
    # Paginate
    total = jobs_query.count()
    jobs = jobs_query.offset((page - 1) * limit).limit(limit).all()
    
    # Check which jobs are saved by user
    saved_job_ids = {
        sj.job_id for sj in db.query(models.SavedJob).filter(
            models.SavedJob.user_id == current_user.id
        ).all()
    }
    
    # Format response
    results = []
    for job in jobs:
        job_dict = {
            "id": job.id,
            "external_id": None,
            "source": "internal",
            "company_id": job.company_id,
            "posted_by_id": job.posted_by_id,
            "title": job.title,
            "description": job.description,
            "requirements": job.requirements,
            "responsibilities": job.responsibilities,
            "employment_type": job.employment_type,
            "experience_level": job.experience_level,
            "category": job.category,
            "location": job.location,
            "is_remote": bool(job.is_remote),
            "is_hybrid": bool(job.is_hybrid),
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "salary_currency": job.salary_currency,
            "salary_period": job.salary_period,
            "required_skills": job.required_skills,
            "nice_to_have_skills": job.nice_to_have_skills,
            "keywords": job.keywords,
            "status": job.status,
            "application_url": job.application_url,
            "application_email": job.application_email,
            "views_count": job.views_count,
            "applications_count": job.applications_count,
            "created_at": job.created_at,
            "updated_at": job.updated_at,
            "company": {
                "id": job.company.id,
                "owner_id": job.company.owner_id,
                "name": job.company.name,
                "description": job.company.description,
                "website": job.company.website,
                "logo_url": job.company.logo_url,
                "industry": job.company.industry,
                "company_size": job.company.company_size,
                "founded_year": job.company.founded_year,
                "location": job.company.location,
                "linkedin_url": job.company.linkedin_url,
                "is_verified": bool(job.company.is_verified),
                "created_at": job.company.created_at,
                "updated_at": job.company.updated_at,
            } if job.company else None,
            "is_saved": job.id in saved_job_ids,
        }
        results.append(job_dict)
    
    # Fetch external jobs if requested
    external_jobs = []
    if include_external:
        try:
            external_jobs = job_fetcher.fetch_jobs(
                query=query or "",
                location=location or "",
                page=page,
                limit=limit
            )
            # Format external jobs to match internal format
            for ext_job in external_jobs:
                ext_job["is_saved"] = False
                ext_job["source"] = ext_job.get("external_source", "external")
                ext_job["id"] = ext_job.get("external_id", 0)
                ext_job["company_id"] = None
                ext_job["posted_by_id"] = None
                ext_job["views_count"] = 0
                ext_job["applications_count"] = 0
                ext_job["created_at"] = ext_job.get("posted_at", datetime.utcnow().isoformat())
                ext_job["updated_at"] = ext_job.get("posted_at", datetime.utcnow().isoformat())
                ext_job["status"] = "active"
                ext_job["application_email"] = None
        except Exception as e:
            # Log error but don't fail the request
            log.error(f"Failed to fetch external jobs: {e}")
    
    # Combine results
    all_jobs = results + external_jobs
    
    return {
        "jobs": all_jobs,
        "total": total + len(external_jobs),
        "page": page,
        "pages": (total + len(external_jobs) + limit - 1) // limit,
        "sources": {
            "internal": len(results),
            "external": len(external_jobs),
        }
    }


@app.get("/jobs/{job_id}")
def get_job(
    job_id: str,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Get a specific job."""
    # Check if it's an external job (contains underscore or non-numeric characters)
    if '_' in job_id or not job_id.isdigit():
        # Parse external job ID to get source and original ID
        if '_' in job_id:
            parts = job_id.split('_', 1)
            source = parts[0]  # e.g., "jooble", "adzuna"
            original_id = parts[1]  # e.g., "-3698814023299470456"
        else:
            source = "external"
            original_id = job_id
        
        # Try to fetch fresh details from external API
        external_job_data = None
        try:
            if source == "jooble" and job_fetcher.jooble_api_key:
                # Jooble doesn't have a single job fetch API, but we can construct the URL
                external_job_data = {
                    "application_url": f"https://jooble.org/jdp/{original_id}",
                    "external_source": "jooble",
                }
            elif source == "adzuna":
                # Adzuna jobs have redirect URLs
                external_job_data = {
                    "application_url": f"https://www.adzuna.in/details/{original_id}",
                    "external_source": "adzuna",
                }
        except Exception as e:
            log.error(f"Failed to fetch external job details: {e}")
        
        # Check if user has saved this job (external job)
        is_saved = db.query(models.SavedJob).filter(
            models.SavedJob.user_id == current_user.id,
            models.SavedJob.external_job_id == job_id
        ).first() is not None
        
        # Build the correct application URL
        if external_job_data and external_job_data.get("application_url"):
            application_url = external_job_data["application_url"]
        elif source == "jooble":
            application_url = f"https://jooble.org/jdp/{original_id}"
        elif source == "adzuna":
            application_url = f"https://www.adzuna.in/details/{original_id}"
        else:
            application_url = f"https://www.google.com/search?q={job_id}"
        
        # Return external job structure with correct URL
        return {
            "id": job_id,
            "external_id": job_id,
            "source": source,
            "company_id": None,
            "posted_by_id": None,
            "title": "External Job",
            "description": "This is an external job posting. Click Apply to view the full details and apply on the external site.",
            "requirements": "",
            "responsibilities": "",
            "employment_type": "full-time",
            "experience_level": "mid",
            "category": "Other",
            "location": "Remote",
            "is_remote": True,
            "is_hybrid": False,
            "salary_min": None,
            "salary_max": None,
            "salary_currency": "USD",
            "salary_period": "yearly",
            "required_skills": [],
            "nice_to_have_skills": [],
            "keywords": [],
            "status": "active",
            "application_url": application_url,
            "application_email": None,
            "views_count": 0,
            "applications_count": 0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "company": None,
            "is_saved": is_saved,
        }
    
    # Internal job - parse as int
    job = db.query(models.Job).filter(models.Job.id == int(job_id)).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Increment view count
    job.views_count += 1
    db.commit()
    
    return job


@app.put("/jobs/{job_id}", response_model=schemas.JobResponse)
def update_job(
    job_id: int,
    req: schemas.JobUpdate,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Update a job posting."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check ownership
    if job.posted_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this job")
    
    update_data = req.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)
    
    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)
    return job


@app.delete("/jobs/{job_id}")
def delete_job(
    job_id: int,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Delete a job posting."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check ownership
    if job.posted_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this job")
    
    db.delete(job)
    db.commit()
    
    return {"message": "Job deleted successfully"}


@app.get("/jobs/my/posted")
def get_my_posted_jobs(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Get all jobs posted by the current user."""
    jobs = db.query(models.Job).filter(models.Job.posted_by_id == current_user.id).all()
    return jobs


# --------------------------------------------------
# Saved Jobs (For Candidates)
# --------------------------------------------------

@app.post("/jobs/{job_id}/save")
def save_job(
    job_id: str,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Save a job for later. Supports both internal (int) and external (string) job IDs."""
    
    # Check if it's an external job
    is_external = '_' in job_id or not job_id.isdigit()
    
    if is_external:
        # External job - parse source and ID
        if '_' in job_id:
            parts = job_id.split('_', 1)
            source = parts[0]  # "jooble", "adzuna"
            external_id = job_id  # full ID like "jooble_123"
        else:
            source = "external"
            external_id = job_id
        
        # Check if already saved
        existing = db.query(models.SavedJob).filter(
            models.SavedJob.user_id == current_user.id,
            models.SavedJob.external_job_id == external_id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Job already saved")
        
        # Create saved job entry for external job
        saved = models.SavedJob(
            user_id=current_user.id,
            job_id=None,
            external_job_id=external_id,
            job_source=source,
            job_data={}  # Could store job details here if needed
        )
        db.add(saved)
        db.commit()
        
        return {"message": "Job saved successfully"}
    else:
        # Internal job
        internal_job_id = int(job_id)
        
        # Check if job exists
        job = db.query(models.Job).filter(models.Job.id == internal_job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check if already saved
        existing = db.query(models.SavedJob).filter(
            models.SavedJob.user_id == current_user.id,
            models.SavedJob.job_id == internal_job_id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Job already saved")
        
        saved = models.SavedJob(
            user_id=current_user.id,
            job_id=internal_job_id,
            external_job_id=None,
            job_source="internal"
        )
        db.add(saved)
        db.commit()
        
        return {"message": "Job saved successfully"}


@app.delete("/jobs/{job_id}/save")
def unsave_job(
    job_id: str,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Remove a saved job. Supports both internal (int) and external (string) job IDs."""
    
    # Check if it's an external job
    is_external = '_' in job_id or not job_id.isdigit()
    
    if is_external:
        # External job
        saved = db.query(models.SavedJob).filter(
            models.SavedJob.user_id == current_user.id,
            models.SavedJob.external_job_id == job_id
        ).first()
        
        if not saved:
            raise HTTPException(status_code=404, detail="Saved job not found")
        
        db.delete(saved)
        db.commit()
        
        return {"message": "Job removed from saved"}
    else:
        # Internal job
        internal_job_id = int(job_id)
        
        saved = db.query(models.SavedJob).filter(
            models.SavedJob.user_id == current_user.id,
            models.SavedJob.job_id == internal_job_id
        ).first()
        
        if not saved:
            raise HTTPException(status_code=404, detail="Saved job not found")
        
        db.delete(saved)
        db.commit()
        
        return {"message": "Job removed from saved"}


@app.get("/jobs/saved")
@app.get("/jobs/saved/list")  # Keep both endpoints for compatibility
def get_saved_jobs(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Get all saved jobs for the current user (both internal and external)."""
    saved = db.query(models.SavedJob).filter(
        models.SavedJob.user_id == current_user.id
    ).order_by(models.SavedJob.created_at.desc()).all()
    
    results = []
    for sj in saved:
        # Handle external jobs
        if sj.external_job_id:
            job_data = sj.job_data or {}
            
            # Build application URL based on source
            if sj.job_source == "jooble":
                original_id = sj.external_job_id.replace("jooble_", "")
                application_url = f"https://jooble.org/jdp/{original_id}"
            elif sj.job_source == "adzuna":
                original_id = sj.external_job_id.replace("adzuna_", "")
                application_url = f"https://www.adzuna.in/details/{original_id}"
            else:
                application_url = job_data.get("application_url", "")
            
            job_dict = {
                "id": sj.external_job_id,
                "saved_id": sj.id,
                "user_id": sj.user_id,
                "job_id": None,
                "external_job_id": sj.external_job_id,
                "job_source": sj.job_source,
                "created_at": sj.created_at,
                "job": {
                    "id": sj.external_job_id,
                    "external_id": sj.external_job_id,
                    "source": sj.job_source,
                    "title": job_data.get("title", "External Job"),
                    "company": {
                        "name": job_data.get("company_name", "Unknown Company"),
                    },
                    "location": job_data.get("location", "Remote"),
                    "is_remote": job_data.get("is_remote", True),
                    "employment_type": job_data.get("employment_type", "full-time"),
                    "salary_min": job_data.get("salary_min"),
                    "salary_max": job_data.get("salary_max"),
                    "salary_currency": job_data.get("salary_currency", "USD"),
                    "required_skills": job_data.get("required_skills", []),
                    "application_url": application_url,
                    "is_saved": True,
                }
            }
        else:
            # Internal job
            job_dict = {
                "id": sj.job_id,
                "saved_id": sj.id,
                "user_id": sj.user_id,
                "job_id": sj.job_id,
                "external_job_id": None,
                "job_source": "internal",
                "created_at": sj.created_at,
                "job": {
                    "id": sj.job.id,
                    "external_id": None,
                    "source": "internal",
                    "company_id": sj.job.company_id,
                    "posted_by_id": sj.job.posted_by_id,
                    "title": sj.job.title,
                    "description": sj.job.description,
                    "requirements": sj.job.requirements,
                    "responsibilities": sj.job.responsibilities,
                    "employment_type": sj.job.employment_type,
                    "experience_level": sj.job.experience_level,
                    "category": sj.job.category,
                    "location": sj.job.location,
                    "is_remote": bool(sj.job.is_remote),
                    "is_hybrid": bool(sj.job.is_hybrid),
                    "salary_min": sj.job.salary_min,
                    "salary_max": sj.job.salary_max,
                    "salary_currency": sj.job.salary_currency,
                    "salary_period": sj.job.salary_period,
                    "required_skills": sj.job.required_skills,
                    "nice_to_have_skills": sj.job.nice_to_have_skills,
                    "keywords": sj.job.keywords,
                    "status": sj.job.status,
                    "application_url": sj.job.application_url,
                    "application_email": sj.job.application_email,
                    "views_count": sj.job.views_count,
                    "applications_count": sj.job.applications_count,
                    "created_at": sj.job.created_at,
                    "updated_at": sj.job.updated_at,
                    "company": {
                        "id": sj.job.company.id if sj.job.company else None,
                        "owner_id": sj.job.company.owner_id if sj.job.company else None,
                        "name": sj.job.company.name if sj.job.company else "Unknown Company",
                        "description": sj.job.company.description if sj.job.company else None,
                        "website": sj.job.company.website if sj.job.company else None,
                        "logo_url": sj.job.company.logo_url if sj.job.company else None,
                        "industry": sj.job.company.industry if sj.job.company else None,
                        "company_size": sj.job.company.company_size if sj.job.company else None,
                        "founded_year": sj.job.company.founded_year if sj.job.company else None,
                        "location": sj.job.company.location if sj.job.company else None,
                        "linkedin_url": sj.job.company.linkedin_url if sj.job.company else None,
                        "is_verified": bool(sj.job.company.is_verified) if sj.job.company else False,
                        "created_at": sj.job.company.created_at if sj.job.company else None,
                        "updated_at": sj.job.company.updated_at if sj.job.company else None,
                    },
                    "is_saved": True,
                }
            }
        results.append(job_dict)
    
    return results


# --------------------------------------------------
# Job Applications
# --------------------------------------------------

@app.post("/applications")
def apply_to_job(
    req: schemas.JobApplicationCreate,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Apply to a job."""
    # Check if job exists and is active
    job = db.query(models.Job).filter(
        models.Job.id == req.job_id,
        models.Job.status == "active"
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not active")
    
    # Check if user has a resume
    resume = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=400, detail="Create a resume before applying")
    
    # Check if already applied
    existing = db.query(models.JobApplication).filter(
        models.JobApplication.job_id == req.job_id,
        models.JobApplication.candidate_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this job")
    
    # Calculate match score
    resume_data = {
        'skills': resume.skills,
        'work_experience': resume.work_experience,
        'preferred_location': resume.preferred_location,
        'remote_preference': resume.remote_preference,
        'keywords': resume.keywords,
    }
    
    job_data = {
        'title': job.title,
        'description': job.description,
        'required_skills': job.required_skills,
        'nice_to_have_skills': job.nice_to_have_skills,
        'experience_level': job.experience_level,
        'location': job.location,
        'is_remote': bool(job.is_remote),
        'is_hybrid': bool(job.is_hybrid),
        'keywords': job.keywords,
    }
    
    match_result = matcher.calculate_match(resume_data, job_data)
    
    application = models.JobApplication(
        job_id=req.job_id,
        candidate_id=current_user.id,
        resume_id=resume.id,
        cover_letter=req.cover_letter,
        custom_answers=req.custom_answers,
        match_score=match_result.score,
        match_reasons=match_result.reasons
    )
    db.add(application)
    
    # Increment job application count
    job.applications_count += 1
    
    db.commit()
    db.refresh(application)
    
    return {
        "message": "Application submitted successfully",
        "application_id": application.id,
        "match_score": match_result.score,
        "match_reasons": match_result.reasons
    }


@app.get("/applications/my")
def get_my_applications(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Get all applications submitted by the current user."""
    applications = db.query(models.JobApplication).filter(
        models.JobApplication.candidate_id == current_user.id
    ).order_by(models.JobApplication.applied_at.desc()).all()
    
    results = []
    for app in applications:
        results.append({
            "id": app.id,
            "job_id": app.job_id,
            "candidate_id": app.candidate_id,
            "resume_id": app.resume_id,
            "status": app.status,
            "match_score": app.match_score,
            "match_reasons": app.match_reasons,
            "applied_at": app.applied_at,
            "reviewed_at": app.reviewed_at,
            "job": {
                "id": app.job.id,
                "title": app.job.title,
                "company": {
                    "id": app.job.company.id,
                    "name": app.job.company.name,
                    "logo_url": app.job.company.logo_url,
                } if app.job.company else None,
                "location": app.job.location,
                "is_remote": bool(app.job.is_remote),
                "employment_type": app.job.employment_type,
            }
        })
    
    return results


@app.get("/applications/received")
def get_received_applications(
    job_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Get applications received for jobs posted by the user (recruiter view)."""
    # Get user's company
    company = db.query(models.Company).filter(models.Company.owner_id == current_user.id).first()
    
    if not company:
        raise HTTPException(status_code=400, detail="No company profile found")
    
    # Get applications for jobs from this company
    query = db.query(models.JobApplication).join(models.Job).filter(
        models.Job.company_id == company.id
    )
    
    if job_id:
        query = query.filter(models.JobApplication.job_id == job_id)
    
    if status:
        query = query.filter(models.JobApplication.status == status)
    
    applications = query.order_by(models.JobApplication.applied_at.desc()).all()
    
    results = []
    for app in applications:
        candidate_resume = db.query(models.Resume).filter(
            models.Resume.user_id == app.candidate_id
        ).first()
        
        results.append({
            "id": app.id,
            "job_id": app.job_id,
            "candidate_id": app.candidate_id,
            "resume_id": app.resume_id,
            "status": app.status,
            "match_score": app.match_score,
            "match_reasons": app.match_reasons,
            "applied_at": app.applied_at,
            "reviewed_at": app.reviewed_at,
            "notes": app.notes,
            "job": {
                "id": app.job.id,
                "title": app.job.title,
            },
            "candidate": {
                "id": app.candidate.id,
                "username": app.candidate.username,
                "email": app.candidate.email,
                "resume": {
                    "full_name": candidate_resume.full_name if candidate_resume else None,
                    "email": candidate_resume.email if candidate_resume else None,
                    "phone": candidate_resume.phone if candidate_resume else None,
                    "location": candidate_resume.location if candidate_resume else None,
                    "skills": candidate_resume.skills if candidate_resume else [],
                    "ats_score": candidate_resume.ats_score if candidate_resume else 0,
                    "pdf_url": candidate_resume.pdf_url if candidate_resume else None,
                }
            }
        })
    
    return results


@app.patch("/applications/{application_id}")
def update_application_status(
    application_id: int,
    req: schemas.JobApplicationUpdate,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Update application status (recruiter only)."""
    application = db.query(models.JobApplication).filter(
        models.JobApplication.id == application_id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check if user owns the job
    if application.job.posted_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if req.status:
        application.status = req.status
        if req.status in ["reviewing", "shortlisted", "rejected", "hired"]:
            application.reviewed_at = datetime.utcnow()
    
    if req.notes is not None:
        application.notes = req.notes
    
    db.commit()
    db.refresh(application)
    
    return {"message": "Application updated", "status": application.status}


# --------------------------------------------------
# Resume Search (For Organizations)
# --------------------------------------------------

@app.post("/resumes/search")
def search_resumes(
    filters: schemas.ResumeSearchFilters,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Search for candidate resumes (organization only)."""
    # Check if user is an organization
    if current_user.user_type != "organization":
        raise HTTPException(
            status_code=403, 
            detail="Only organizations can search resumes"
        )
    
    # Build query
    query = db.query(models.Resume).filter(
        models.Resume.is_public == 1,
        models.Resume.is_active == 1
    )
    
    if filters.skills:
        for skill in filters.skills:
            query = query.filter(models.Resume.skills.contains([skill]))
    
    if filters.location:
        query = query.filter(
            models.Resume.preferred_location.ilike(f"%{filters.location}%")
        )
    
    if filters.remote_preference:
        query = query.filter(
            models.Resume.remote_preference == filters.remote_preference
        )
    
    if filters.min_ats_score:
        query = query.filter(models.Resume.ats_score >= filters.min_ats_score)
    
    # Order by ATS score (highest first)
    query = query.order_by(models.Resume.ats_score.desc())
    
    total = query.count()
    resumes = query.offset((filters.page - 1) * filters.limit).limit(filters.limit).all()
    
    results = []
    for resume in resumes:
        results.append({
            "id": resume.id,
            "user_id": resume.user_id,
            "full_name": resume.full_name,
            "location": resume.location,
            "summary": resume.summary,
            "skills": resume.skills,
            "ats_score": resume.ats_score,
            "keywords": resume.keywords,
            "is_active": bool(resume.is_active),
            "expected_salary_min": resume.expected_salary_min,
            "expected_salary_max": resume.expected_salary_max,
            "preferred_location": resume.preferred_location,
            "remote_preference": resume.remote_preference,
            "created_at": resume.created_at,
            "updated_at": resume.updated_at,
        })
    
    return {
        "resumes": results,
        "total": total,
        "page": filters.page,
        "pages": (total + filters.limit - 1) // filters.limit
    }


@app.post("/jobs/{job_id}/match-candidates")
def match_candidates_to_job(
    job_id: int,
    min_score: float = 50,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Find matching candidates for a specific job."""
    # Check ownership
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.posted_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all public resumes
    resumes = db.query(models.Resume).filter(
        models.Resume.is_public == 1,
        models.Resume.is_active == 1
    ).all()
    
    job_data = {
        'title': job.title,
        'description': job.description,
        'required_skills': job.required_skills,
        'nice_to_have_skills': job.nice_to_have_skills,
        'experience_level': job.experience_level,
        'location': job.location,
        'is_remote': bool(job.is_remote),
        'is_hybrid': bool(job.is_hybrid),
        'keywords': job.keywords,
    }
    
    # Rank candidates
    ranked = []
    for resume in resumes:
        resume_data = {
            'skills': resume.skills,
            'work_experience': resume.work_experience,
            'preferred_location': resume.preferred_location,
            'remote_preference': resume.remote_preference,
            'keywords': resume.keywords,
        }
        
        match_result = matcher.calculate_match(resume_data, job_data)
        
        if match_result.score >= min_score:
            ranked.append({
                "resume": {
                    "id": resume.id,
                    "user_id": resume.user_id,
                    "full_name": resume.full_name,
                    "location": resume.location,
                    "summary": resume.summary,
                    "skills": resume.skills,
                    "ats_score": resume.ats_score,
                    "expected_salary_min": resume.expected_salary_min,
                    "expected_salary_max": resume.expected_salary_max,
                    "preferred_location": resume.preferred_location,
                    "remote_preference": resume.remote_preference,
                },
                "match_score": match_result.score,
                "matching_skills": match_result.matching_skills,
                "missing_skills": match_result.missing_skills,
                "match_reasons": match_result.reasons,
            })
    
    # Sort by match score
    ranked.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {
        "job_id": job_id,
        "total_matches": len(ranked),
        "candidates": ranked[:50]  # Return top 50 matches
    }


# --------------------------------------------------
# Job Recommendations (For Candidates)
# --------------------------------------------------

@app.get("/jobs/recommended")
def get_recommended_jobs(
    limit: int = 10,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Get job recommendations based on resume."""
    try:
        resume = db.query(models.Resume).filter(models.Resume.user_id == current_user.id).first()
        
        if not resume:
            # Return recent jobs if no resume
            jobs = db.query(models.Job).filter(
                models.Job.status == "active"
            ).order_by(models.Job.created_at.desc()).limit(limit).all()
            
            # Format jobs for response
            results = []
            for job in jobs:
                results.append({
                    "id": job.id,
                    "title": job.title,
                    "company": {
                        "id": job.company.id if job.company else None,
                        "name": job.company.name if job.company else "Unknown Company",
                        "logo_url": job.company.logo_url if job.company else None,
                    } if job.company else {"name": "Unknown Company"},
                    "location": job.location,
                    "is_remote": bool(job.is_remote),
                    "employment_type": job.employment_type,
                    "salary_min": job.salary_min,
                    "salary_max": job.salary_max,
                    "required_skills": job.required_skills,
                    "match_score": None,
                    "matching_skills": [],
                    "match_reasons": [],
                })
            
            return {"jobs": results, "source": "recent"}
        
        # Parse work_experience if it's stored as strings
        import ast
        work_exp = resume.work_experience or []
        parsed_work_exp = []
        for exp in work_exp:
            if isinstance(exp, str) and exp.startswith('{') and exp.endswith('}'):
                try:
                    parsed_exp = ast.literal_eval(exp)
                    if isinstance(parsed_exp, dict):
                        parsed_work_exp.append(parsed_exp)
                    else:
                        parsed_work_exp.append(exp)
                except (ValueError, SyntaxError):
                    parsed_work_exp.append(exp)
            else:
                parsed_work_exp.append(exp)
        
        resume_data = {
            'skills': resume.skills or [],
            'work_experience': parsed_work_exp,
            'preferred_location': resume.preferred_location or '',
            'remote_preference': resume.remote_preference or 'any',
            'keywords': resume.keywords or [],
        }
        
        # Get active jobs
        jobs = db.query(models.Job).filter(
            models.Job.status == "active"
        ).all()
        
        # Score and rank
        scored_jobs = []
        for job in jobs:
            try:
                job_data = {
                    'title': job.title or '',
                    'description': job.description or '',
                    'required_skills': job.required_skills or [],
                    'nice_to_have_skills': job.nice_to_have_skills or [],
                    'experience_level': job.experience_level or '',
                    'location': job.location or '',
                    'is_remote': bool(job.is_remote),
                    'is_hybrid': bool(job.is_hybrid),
                    'keywords': job.keywords or [],
                }
                
                match_result = matcher.calculate_match(resume_data, job_data)
                
                scored_jobs.append({
                    "job": job,
                    "match_score": match_result.score,
                    "matching_skills": match_result.matching_skills,
                    "match_reasons": match_result.reasons,
                })
            except Exception as e:
                log.error(f"Error matching job {job.id}: {e}")
                # Still add job with 0 score
                scored_jobs.append({
                    "job": job,
                    "match_score": 0,
                    "matching_skills": [],
                    "match_reasons": [],
                })
        
        # Sort by match score
        scored_jobs.sort(key=lambda x: x["match_score"], reverse=True)
        
        # Format response
        results = []
        for item in scored_jobs[:limit]:
            try:
                job = item["job"]
                results.append({
                    "id": job.id,
                    "title": job.title,
                    "company": {
                        "id": job.company.id if job.company else None,
                        "name": job.company.name if job.company else "Unknown Company",
                        "logo_url": job.company.logo_url if job.company else None,
                    } if job.company else {"name": "Unknown Company"},
                    "location": job.location,
                    "is_remote": bool(job.is_remote),
                    "employment_type": job.employment_type,
                    "salary_min": job.salary_min,
                    "salary_max": job.salary_max,
                    "required_skills": job.required_skills,
                    "match_score": round(item["match_score"]),
                    "matching_skills": item["matching_skills"],
                    "match_reasons": item["match_reasons"],
                })
            except Exception as e:
                log.error(f"Error formatting job result: {e}")
                continue
        
        return {"jobs": results, "source": "matched"}
    except Exception as e:
        log.error(f"Error in get_recommended_jobs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")


# --------------------------------------------------
# Job Categories & Metadata
# --------------------------------------------------

@app.get("/jobs/metadata/categories")
def get_job_categories():
    """Get all job categories."""
    categories = [
        "Software Engineering",
        "Data Science",
        "Product Management",
        "Design",
        "Marketing",
        "Sales",
        "Customer Support",
        "Human Resources",
        "Finance",
        "Operations",
        "Legal",
        "Healthcare",
        "Education",
        "Other"
    ]
    return categories


@app.get("/jobs/metadata/employment-types")
def get_employment_types():
    """Get all employment types."""
    return [
        {"value": "full-time", "label": "Full-time"},
        {"value": "part-time", "label": "Part-time"},
        {"value": "contract", "label": "Contract"},
        {"value": "internship", "label": "Internship"},
        {"value": "freelance", "label": "Freelance"},
    ]


@app.get("/jobs/metadata/experience-levels")
def get_experience_levels():
    """Get all experience levels."""
    return [
        {"value": "entry", "label": "Entry Level"},
        {"value": "mid", "label": "Mid Level"},
        {"value": "senior", "label": "Senior Level"},
        {"value": "lead", "label": "Lead"},
        {"value": "executive", "label": "Executive"},
    ]


@app.get("/jobs/metadata/company-sizes")
def get_company_sizes():
    """Get all company size options."""
    return [
        {"value": "1-10", "label": "1-10 employees"},
        {"value": "11-50", "label": "11-50 employees"},
        {"value": "51-200", "label": "51-200 employees"},
        {"value": "201-500", "label": "201-500 employees"},
        {"value": "501-1000", "label": "501-1000 employees"},
        {"value": "1000+", "label": "1000+ employees"},
    ]


# ============================================================
# MONETIZATION & BILLING API
# ============================================================

@app.get("/billing/plans")
def get_subscription_plans():
    """Get all available subscription plans"""
    return {
        "plans": [
            {
                "id": plan_id,
                "name": plan["display_name"],
                "description": plan["description"],
                "price_monthly": plan["price_monthly"],
                "price_yearly": plan["price_yearly"],
                "features": plan["features"],
                "limits": plan["limits"],
            }
            for plan_id, plan in SUBSCRIPTION_PLANS.items()
        ],
        "credit_packs": CREDIT_PACKS,
        "job_packages": JOB_POSTING_PACKAGES,
    }


@app.get("/billing/current")
def get_current_subscription(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Get current user's subscription details"""
    plan = SUBSCRIPTION_PLANS.get(current_user.tier, SUBSCRIPTION_PLANS["free"])
    
    # Calculate remaining credits
    remaining_credits = current_user.credits - current_user.credits_used
    if plan["limits"]["monthly_credits"] == -1:
        remaining_credits = -1  # Unlimited
    
    return {
        "tier": current_user.tier,
        "plan_name": plan["display_name"],
        "status": current_user.subscription_status,
        "credits_total": current_user.credits,
        "credits_used": current_user.credits_used,
        "credits_remaining": remaining_credits,
        "features": plan["features"],
        "limits": plan["limits"],
        "current_period_end": current_user.subscription_current_period_end,
        "stripe_customer_id": current_user.stripe_customer_id,
    }


@app.post("/billing/checkout")
def create_checkout_session(
    plan_id: str,
    interval: str = "month",  # "month" or "year"
    current_user: models.User = Depends(authenticate),
):
    """Create Stripe Checkout session for subscription"""
    try:
        price_id = billing_manager._get_stripe_price_id(plan_id, interval)
        if not price_id:
            raise HTTPException(status_code=400, detail="Invalid plan or Stripe not configured")
        
        checkout_url = billing_manager.create_checkout_session(
            current_user, price_id, mode="subscription"
        )
        return {"checkout_url": checkout_url}
    except Exception as e:
        log.error(f"Checkout error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/billing/credits/checkout")
def create_credit_checkout(
    pack_id: str,
    current_user: models.User = Depends(authenticate),
):
    """Create checkout session for credit purchase"""
    try:
        checkout_url = billing_manager.create_credit_purchase_session(current_user, pack_id)
        return {"checkout_url": checkout_url}
    except Exception as e:
        log.error(f"Credit checkout error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/billing/cancel")
def cancel_subscription(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Cancel user's subscription"""
    try:
        success = billing_manager.cancel_subscription(current_user)
        if success:
            current_user.subscription_status = "cancelled"
            db.commit()
            return {"message": "Subscription cancelled successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to cancel subscription")
    except Exception as e:
        log.error(f"Cancel error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/billing/payments")
def get_payment_history(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
    limit: int = 10,
):
    """Get user's payment history"""
    payments = db.query(models.Payment).filter(
        models.Payment.user_id == current_user.id
    ).order_by(models.Payment.created_at.desc()).limit(limit).all()
    
    return [
        {
            "id": p.id,
            "amount": p.amount,
            "currency": p.currency,
            "status": p.status,
            "type": p.payment_type,
            "description": p.description,
            "created_at": p.created_at,
        }
        for p in payments
    ]


@app.post("/billing/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    
    try:
        result = billing_manager.handle_webhook(payload, sig_header)
        return result
    except Exception as e:
        log.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/billing/usage")
def get_usage_stats(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
    days: int = 30,
):
    """Get user's usage statistics"""
    from_date = datetime.utcnow() - timedelta(days=days)
    
    usage_records = db.query(models.UsageRecord).filter(
        models.UsageRecord.user_id == current_user.id,
        models.UsageRecord.created_at >= from_date
    ).all()
    
    # Aggregate by type
    usage_by_type = {}
    total_credits = 0
    
    for record in usage_records:
        if record.usage_type not in usage_by_type:
            usage_by_type[record.usage_type] = {"count": 0, "credits": 0}
        usage_by_type[record.usage_type]["count"] += record.quantity
        usage_by_type[record.usage_type]["credits"] += record.credits_used
        total_credits += record.credits_used
    
    return {
        "period_days": days,
        "total_credits_used": total_credits,
        "usage_by_type": usage_by_type,
        "recent_records": [
            {
                "type": r.usage_type,
                "quantity": r.quantity,
                "credits": r.credits_used,
                "date": r.created_at,
            }
            for r in usage_records[:10]
        ],
    }


@app.post("/billing/usage/track")
def track_user_usage(
    usage_type: str,
    quantity: int = 1,
    extra_data: dict = None,
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    """Track user usage (internal endpoint, mainly for testing)"""
    try:
        track_usage(current_user, usage_type, quantity, extra_data)
        return {"message": "Usage tracked successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
