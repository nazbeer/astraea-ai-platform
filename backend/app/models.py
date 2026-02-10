from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float, Boolean, JSON, UniqueConstraint
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
    tier = Column(String, default="free")  # "free", "pro", "enterprise"
    is_premium = Column(Integer, default=0)
    improve_model = Column(Integer, default=1)
    user_type = Column(String, default="candidate")  # "candidate" or "organization"
    
    # Credits system for pay-per-use
    credits = Column(Integer, default=100)  # Free monthly credits
    credits_used = Column(Integer, default=0)
    
    # Stripe fields
    stripe_customer_id = Column(String, unique=True, nullable=True)
    stripe_subscription_id = Column(String, unique=True, nullable=True)
    subscription_status = Column(String, default="inactive")  # "active", "inactive", "cancelled", "past_due"
    subscription_current_period_end = Column(DateTime, nullable=True)
    
    sessions = relationship("ChatSession", back_populates="owner")
    custom_models = relationship("CustomModel", back_populates="owner")
    
    # Job platform relationships
    resume = relationship("Resume", back_populates="user", uselist=False)
    job_applications = relationship("JobApplication", back_populates="candidate")
    company = relationship("Company", back_populates="owner", uselist=False)
    jobs_posted = relationship("Job", back_populates="posted_by")
    
    # Monetization relationships
    payments = relationship("Payment", back_populates="user")
    usage_records = relationship("UsageRecord", back_populates="user")

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
    extracted_text = Column(Text)  # Extracted content for RAG
    created_at = Column(DateTime, default=datetime.utcnow)

    model = relationship("CustomModel", back_populates="files")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, default="New Chat")
    is_archived = Column(Integer, default=0)  # 0 or 1 for SQLite compatibility
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"))
    role = Column(String)  # 'user' or 'assistant'
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")

# ============================================================
# JOB PLATFORM MODELS
# ============================================================

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), unique=True)
    name = Column(String)
    description = Column(Text)
    website = Column(String)
    logo_url = Column(String)
    industry = Column(String)
    company_size = Column(String)
    founded_year = Column(Integer)
    location = Column(String)
    linkedin_url = Column(String)
    is_verified = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="company")
    jobs = relationship("Job", back_populates="company")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    posted_by_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text)
    requirements = Column(Text)
    responsibilities = Column(Text)
    employment_type = Column(String)  # full-time, part-time, contract, internship
    experience_level = Column(String)  # entry, mid, senior, lead
    category = Column(String)
    location = Column(String)
    is_remote = Column(Integer, default=0)
    is_hybrid = Column(Integer, default=0)
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    salary_currency = Column(String, default="USD")
    salary_period = Column(String, default="yearly")  # yearly, monthly, hourly
    required_skills = Column(JSON, default=list)
    nice_to_have_skills = Column(JSON, default=list)
    keywords = Column(JSON, default=list)
    status = Column(String, default="active")  # active, paused, closed
    application_url = Column(String, nullable=True)
    application_email = Column(String, nullable=True)
    views_count = Column(Integer, default=0)
    applications_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="jobs")
    posted_by = relationship("User", back_populates="jobs_posted")
    applications = relationship("JobApplication", back_populates="job")

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    # Contact Information
    full_name = Column(String)
    email = Column(String)
    phone = Column(String)
    location = Column(String)
    
    # Social Links
    linkedin_url = Column(String, nullable=True)
    portfolio_url = Column(String, nullable=True)
    github_url = Column(String, nullable=True)
    twitter_url = Column(String, nullable=True)
    medium_url = Column(String, nullable=True)
    dribbble_url = Column(String, nullable=True)
    other_url = Column(String, nullable=True)
    
    # Content
    summary = Column(Text, nullable=True)
    work_experience = Column(JSON, default=list)  # List of {title, company, location, start_date, end_date, description, achievements}
    education = Column(JSON, default=list)  # List of {degree, institution, location, graduation_date, gpa}
    skills = Column(JSON, default=list)  # List of skill strings
    certifications = Column(JSON, default=list)  # List of {name, issuer, date}
    projects = Column(JSON, default=list)  # List of {name, description, technologies, url}
    languages = Column(JSON, default=list)  # List of {language, proficiency}
    
    # Job Preferences
    expected_salary_min = Column(Integer, nullable=True)
    expected_salary_max = Column(Integer, nullable=True)
    preferred_location = Column(String, nullable=True)
    remote_preference = Column(String, default="any")  # "remote", "onsite", "hybrid", "any"
    
    # ATS & AI
    ats_score = Column(Integer, default=0)
    keywords = Column(JSON, default=list)
    
    # Settings
    is_public = Column(Integer, default=0)
    is_active = Column(Integer, default=1)
    
    # Generated Files
    pdf_url = Column(String, nullable=True)
    docx_url = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="resume")

class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    candidate_id = Column(Integer, ForeignKey("users.id"))
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    
    # Application Details
    cover_letter = Column(Text, nullable=True)
    status = Column(String, default="pending")  # pending, reviewing, shortlisted, rejected, hired
    
    # AI Matching
    match_score = Column(Float, nullable=True)
    match_reasons = Column(JSON, default=list)
    
    # Timestamps
    applied_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    
    job = relationship("Job", back_populates="applications")
    candidate = relationship("User", back_populates="job_applications")

class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)  # For internal jobs
    external_job_id = Column(String, nullable=True)  # For external jobs (e.g., "jooble_123")
    job_source = Column(String, default="internal")  # "internal", "jooble", "adzuna", etc.
    job_data = Column(JSON, default=dict)  # Store external job data for display
    created_at = Column(DateTime, default=datetime.utcnow)

    # Ensure unique saved jobs per user
    __table_args__ = (
        UniqueConstraint('user_id', 'job_id', name='unique_saved_job_internal'),
        UniqueConstraint('user_id', 'external_job_id', name='unique_saved_job_external'),
    )

# ============================================================
# MONETIZATION MODELS
# ============================================================

class SubscriptionPlan(Base):
    """Available subscription plans"""
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)  # "free", "pro", "enterprise"
    display_name = Column(String)
    description = Column(Text)
    price_monthly = Column(Integer)  # In cents (e.g., 999 = $9.99)
    price_yearly = Column(Integer)   # In cents
    stripe_price_id_monthly = Column(String, nullable=True)
    stripe_price_id_yearly = Column(String, nullable=True)
    
    # Features (stored as JSON for flexibility)
    features = Column(JSON, default=dict)  # {"chat_messages": 100, "custom_models": 2, "api_access": false}
    
    # Limits
    monthly_credits = Column(Integer, default=100)
    max_custom_models = Column(Integer, default=0)
    max_chat_sessions = Column(Integer, default=10)
    max_resume_generations = Column(Integer, default=5)
    max_job_applications = Column(Integer, default=10)
    api_access = Column(Integer, default=0)
    priority_support = Column(Integer, default=0)
    
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

class Payment(Base):
    """Payment records"""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    stripe_payment_intent_id = Column(String, unique=True, nullable=True)
    stripe_invoice_id = Column(String, unique=True, nullable=True)
    
    amount = Column(Integer)  # In cents
    currency = Column(String, default="usd")
    status = Column(String)  # "succeeded", "pending", "failed"
    payment_type = Column(String)  # "subscription", "credits", "job_posting"
    description = Column(String)
    
    extra_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="payments")

class UsageRecord(Base):
    """Track user usage for billing"""
    __tablename__ = "usage_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    usage_type = Column(String)  # "chat_message", "custom_model", "resume_generation", "job_application", "api_call"
    quantity = Column(Integer, default=1)
    credits_used = Column(Integer, default=0)
    
    # Context
    extra_data = Column(JSON, default=dict)  # {"model": "gpt-4", "tokens": 150}
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="usage_records")

class CreditPurchase(Base):
    """Credit pack purchases"""
    __tablename__ = "credit_purchases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)  # "Small Pack", "Medium Pack", etc.
    credits = Column(Integer)
    price = Column(Integer)  # In cents
    stripe_price_id = Column(String, unique=True)
    is_active = Column(Integer, default=1)

class JobPostingPackage(Base):
    """Job posting packages for employers"""
    __tablename__ = "job_posting_packages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String)
    
    # What's included
    job_postings = Column(Integer)  # Number of job postings
    featured_duration_days = Column(Integer, default=0)  # Days job stays featured
    resume_database_access = Column(Integer, default=0)  # Boolean
    
    price = Column(Integer)  # In cents
    stripe_price_id = Column(String, unique=True)
    is_active = Column(Integer, default=1)
