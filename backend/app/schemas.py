from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ==================== EXISTING SCHEMAS ====================

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

    class Config:
        from_attributes = True


# ==================== JOB PLATFORM SCHEMAS ====================

# User Type Update
class UserTypeUpdate(BaseModel):
    user_type: str  # "candidate" or "organization"


# Resume Schemas
class WorkExperience(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    is_current: bool = False
    description: str
    achievements: Optional[List[str]] = []

class Education(BaseModel):
    degree: str
    institution: str
    location: Optional[str] = None
    graduation_date: Optional[str] = None
    gpa: Optional[str] = None

class Certification(BaseModel):
    name: str
    issuer: str
    date: Optional[str] = None

class Project(BaseModel):
    name: str
    description: str
    technologies: Optional[List[str]] = []
    url: Optional[str] = None

class Language(BaseModel):
    language: str
    proficiency: str  # "Native", "Fluent", "Professional", "Conversational", "Basic"


class ResumeCreate(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    github_url: Optional[str] = None
    twitter_url: Optional[str] = None
    medium_url: Optional[str] = None
    dribbble_url: Optional[str] = None
    other_url: Optional[str] = None
    summary: Optional[str] = None
    work_experience: List[WorkExperience] = []
    education: List[Education] = []
    skills: List[str] = []
    certifications: List[Certification] = []
    projects: List[Project] = []
    languages: List[Language] = []
    
    # Job Preferences
    expected_salary_min: Optional[int] = None
    expected_salary_max: Optional[int] = None
    preferred_location: Optional[str] = None
    remote_preference: Optional[str] = "any"  # "remote", "onsite", "hybrid", "any"
    is_public: bool = False
    is_active: bool = True


class ResumeUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    github_url: Optional[str] = None
    twitter_url: Optional[str] = None
    medium_url: Optional[str] = None
    dribbble_url: Optional[str] = None
    other_url: Optional[str] = None
    summary: Optional[str] = None
    work_experience: Optional[List[WorkExperience]] = None
    education: Optional[List[Education]] = None
    skills: Optional[List[str]] = None
    certifications: Optional[List[Certification]] = None
    projects: Optional[List[Project]] = None
    languages: Optional[List[Language]] = None
    expected_salary_min: Optional[int] = None
    expected_salary_max: Optional[int] = None
    preferred_location: Optional[str] = None
    remote_preference: Optional[str] = None
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None


class ResumeResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    phone: Optional[str]
    location: Optional[str]
    linkedin_url: Optional[str]
    portfolio_url: Optional[str]
    github_url: Optional[str]
    twitter_url: Optional[str]
    medium_url: Optional[str]
    dribbble_url: Optional[str]
    other_url: Optional[str]
    summary: Optional[str]
    work_experience: List[Dict[str, Any]]
    education: List[Dict[str, Any]]
    skills: List[str]
    certifications: List[Dict[str, Any]]
    projects: List[Dict[str, Any]]
    languages: List[Dict[str, Any]]
    ats_score: int
    keywords: List[str]
    is_public: bool
    is_active: bool
    expected_salary_min: Optional[int]
    expected_salary_max: Optional[int]
    preferred_location: Optional[str]
    remote_preference: str
    pdf_url: Optional[str]
    docx_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Company Schemas
class CompanyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None


class CompanyResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    description: Optional[str]
    website: Optional[str]
    logo_url: Optional[str]
    industry: Optional[str]
    company_size: Optional[str]
    founded_year: Optional[int]
    location: Optional[str]
    linkedin_url: Optional[str]
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Job Schemas
class JobCreate(BaseModel):
    title: str
    description: str
    requirements: str
    responsibilities: Optional[str] = None
    employment_type: str = "full-time"  # "full-time", "part-time", "contract", "internship", "freelance"
    experience_level: str = "mid"  # "entry", "mid", "senior", "lead", "executive"
    category: str
    location: str
    is_remote: bool = False
    is_hybrid: bool = False
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = "USD"
    salary_period: str = "yearly"
    required_skills: List[str] = []
    nice_to_have_skills: List[str] = []
    application_url: Optional[str] = None
    application_email: Optional[str] = None
    expires_at: Optional[datetime] = None


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    is_remote: Optional[bool] = None
    is_hybrid: Optional[bool] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    salary_period: Optional[str] = None
    required_skills: Optional[List[str]] = None
    nice_to_have_skills: Optional[List[str]] = None
    status: Optional[str] = None  # "active", "paused", "closed", "draft"
    application_url: Optional[str] = None
    application_email: Optional[str] = None
    expires_at: Optional[datetime] = None


class JobResponse(BaseModel):
    id: int
    company_id: int
    posted_by_id: int
    title: str
    description: str
    requirements: str
    responsibilities: Optional[str]
    employment_type: str
    experience_level: str
    category: str
    location: str
    is_remote: bool
    is_hybrid: bool
    salary_min: Optional[int]
    salary_max: Optional[int]
    salary_currency: str
    salary_period: str
    required_skills: List[str]
    nice_to_have_skills: List[str]
    keywords: List[str]
    status: str
    application_url: Optional[str]
    application_email: Optional[str]
    views_count: int
    applications_count: int
    created_at: datetime
    updated_at: datetime
    
    # Include company info
    company: Optional[CompanyResponse] = None
    is_saved: bool = False

    class Config:
        from_attributes = True


class JobSearchFilters(BaseModel):
    query: Optional[str] = None
    location: Optional[str] = None
    is_remote: Optional[bool] = None
    is_hybrid: Optional[bool] = None
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None
    category: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    skills: Optional[List[str]] = None
    page: int = 1
    limit: int = 20


# Job Application Schemas
class JobApplicationCreate(BaseModel):
    job_id: int
    cover_letter: Optional[str] = None
    custom_answers: Optional[Dict[str, str]] = None


class JobApplicationUpdate(BaseModel):
    status: Optional[str] = None  # "pending", "reviewing", "shortlisted", "rejected", "hired", "withdrawn"
    notes: Optional[str] = None


class JobApplicationResponse(BaseModel):
    id: int
    job_id: int
    candidate_id: int
    resume_id: int
    cover_letter: Optional[str]
    custom_answers: Dict[str, Any]
    status: str
    match_score: Optional[float]
    match_reasons: List[str]
    applied_at: datetime
    reviewed_at: Optional[datetime]
    notes: Optional[str]
    
    # Include related data
    job: Optional[JobResponse] = None
    candidate: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


# Resume Search Filters (for organizations)
class ResumeSearchFilters(BaseModel):
    query: Optional[str] = None
    skills: Optional[List[str]] = None
    location: Optional[str] = None
    experience_level: Optional[str] = None
    remote_preference: Optional[str] = None
    min_ats_score: Optional[int] = None
    page: int = 1
    limit: int = 20


class ResumeMatchResult(BaseModel):
    resume: ResumeResponse
    match_score: float
    matching_skills: List[str]
    missing_skills: List[str]


# Saved Job Schema
class SavedJobResponse(BaseModel):
    id: int
    user_id: int
    job_id: int
    job: JobResponse
    created_at: datetime

    class Config:
        from_attributes = True
